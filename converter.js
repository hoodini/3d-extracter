// GLB -> STL / 3MF conversion. Runs in popup context (needs Blob URLs).
// Exposes window.GLBConverter = { convertGlb, parseGLB, ... }

(function (global) {
  'use strict';

  // ============================== GLB parser ===============================

  function parseGLB(arrayBuffer) {
    if (arrayBuffer.byteLength < 12) throw new Error('File too small to be a GLB.');
    const view = new DataView(arrayBuffer);
    if (view.getUint32(0, true) !== 0x46546C67) {
      throw new Error('Not a GLB (magic mismatch). Only self-contained .glb is supported — for .gltf with external buffers, convert in Blender first.');
    }
    const version = view.getUint32(4, true);
    if (version !== 2) throw new Error('Unsupported GLB version: ' + version);

    let offset = 12;
    const jsonLen = view.getUint32(offset, true);
    if (view.getUint32(offset + 4, true) !== 0x4E4F534A) throw new Error('First GLB chunk must be JSON.');
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, offset + 8, jsonLen)));
    offset += 8 + jsonLen;

    let binBytes = null;
    if (offset < arrayBuffer.byteLength) {
      const binLen = view.getUint32(offset, true);
      if (view.getUint32(offset + 4, true) === 0x004E4942) {
        binBytes = new Uint8Array(arrayBuffer, offset + 8, binLen);
      }
    }
    return { json, binBytes };
  }

  // ============================== accessors ================================

  const COMPONENT = {
    5120: { ctor: Int8Array, size: 1, get: (dv, o) => dv.getInt8(o) },
    5121: { ctor: Uint8Array, size: 1, get: (dv, o) => dv.getUint8(o) },
    5122: { ctor: Int16Array, size: 2, get: (dv, o) => dv.getInt16(o, true) },
    5123: { ctor: Uint16Array, size: 2, get: (dv, o) => dv.getUint16(o, true) },
    5125: { ctor: Uint32Array, size: 4, get: (dv, o) => dv.getUint32(o, true) },
    5126: { ctor: Float32Array, size: 4, get: (dv, o) => dv.getFloat32(o, true) }
  };
  const TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

  function readAccessor(json, idx, binBytes) {
    const acc = json.accessors[idx];
    if (acc.bufferView === undefined) throw new Error('Sparse accessors not supported.');
    const bv = json.bufferViews[acc.bufferView];
    const buf = json.buffers[bv.buffer];
    if (buf.uri) throw new Error('External buffer "' + buf.uri + '" not supported — use a self-contained .glb.');
    if (!binBytes) throw new Error('GLB has no binary chunk.');

    const ci = COMPONENT[acc.componentType];
    const comps = TYPE_COUNT[acc.type];
    const tight = comps * ci.size;
    const stride = bv.byteStride || tight;
    const start = (acc.byteOffset || 0) + (bv.byteOffset || 0);

    if (stride === tight) {
      const slice = binBytes.buffer.slice(
        binBytes.byteOffset + start,
        binBytes.byteOffset + start + acc.count * tight
      );
      return new ci.ctor(slice);
    }

    // Interleaved — walk element by element.
    const out = new ci.ctor(acc.count * comps);
    const dv = new DataView(binBytes.buffer, binBytes.byteOffset);
    for (let i = 0; i < acc.count; i++) {
      for (let c = 0; c < comps; c++) {
        out[i * comps + c] = ci.get(dv, start + i * stride + c * ci.size);
      }
    }
    return out;
  }

  // ============================== matrices =================================

  function identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  // Column-major 4x4 multiply (glTF convention).
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[i + k * 4] * b[k + j * 4];
      o[i + j * 4] = s;
    }
    return o;
  }

  function transformPoint(m, p) {
    return [
      m[0]*p[0] + m[4]*p[1] + m[8]*p[2]  + m[12],
      m[1]*p[0] + m[5]*p[1] + m[9]*p[2]  + m[13],
      m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14]
    ];
  }

  function nodeMatrix(node) {
    if (node.matrix) return new Float32Array(node.matrix);
    const t = node.translation || [0, 0, 0];
    const r = node.rotation || [0, 0, 0, 1];
    const s = node.scale || [1, 1, 1];
    const [qx, qy, qz, qw] = r;
    const xx=qx*qx, yy=qy*qy, zz=qz*qz;
    const xy=qx*qy, xz=qx*qz, yz=qy*qz;
    const wx=qw*qx, wy=qw*qy, wz=qw*qz;
    return new Float32Array([
      (1 - 2*(yy + zz)) * s[0], 2*(xy + wz) * s[0],       2*(xz - wy) * s[0],       0,
      2*(xy - wz) * s[1],       (1 - 2*(xx + zz)) * s[1], 2*(yz + wx) * s[1],       0,
      2*(xz + wy) * s[2],       2*(yz - wx) * s[2],       (1 - 2*(xx + yy)) * s[2], 0,
      t[0], t[1], t[2], 1
    ]);
  }

  // ============================== DRACO ====================================

  let dracoPromise = null;
  function getDraco() {
    if (dracoPromise) return dracoPromise;
    if (typeof DracoDecoderModule === 'undefined') {
      return Promise.reject(new Error(
        'DRACO decoder is not loaded. The model uses KHR_draco_mesh_compression. ' +
        'Make sure lib/draco_wasm_wrapper.js is present in the extension.'
      ));
    }
    dracoPromise = DracoDecoderModule({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) return chrome.runtime.getURL('lib/draco_decoder.wasm');
        return path;
      }
    });
    return dracoPromise;
  }

  async function decodeDraco(primitive, json, binBytes) {
    const ext = primitive.extensions.KHR_draco_mesh_compression;
    const bv = json.bufferViews[ext.bufferView];
    if (!binBytes) throw new Error('DRACO requires the GLB binary chunk.');
    const data = binBytes.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);

    const draco = await getDraco();
    const decoder = new draco.Decoder();
    const buf = new draco.DecoderBuffer();
    buf.Init(data, data.length);

    if (decoder.GetEncodedGeometryType(buf) !== draco.TRIANGULAR_MESH) {
      draco.destroy(buf); draco.destroy(decoder);
      throw new Error('DRACO primitive is not a triangular mesh.');
    }

    const mesh = new draco.Mesh();
    const status = decoder.DecodeBufferToMesh(buf, mesh);
    if (!status.ok()) {
      const msg = status.error_msg();
      draco.destroy(mesh); draco.destroy(buf); draco.destroy(decoder);
      throw new Error('DRACO decode failed: ' + msg);
    }

    const posAttrId = ext.attributes.POSITION;
    if (posAttrId === undefined) {
      draco.destroy(mesh); draco.destroy(buf); draco.destroy(decoder);
      throw new Error('DRACO primitive missing POSITION attribute.');
    }
    const posAttr = decoder.GetAttributeByUniqueId(mesh, posAttrId);

    const numPoints = mesh.num_points();
    const positions = new Float32Array(numPoints * 3);
    const posArr = new draco.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(mesh, posAttr, posArr);
    for (let i = 0; i < numPoints * 3; i++) positions[i] = posArr.GetValue(i);
    draco.destroy(posArr);

    const numFaces = mesh.num_faces();
    const indices = numPoints > 65535
      ? new Uint32Array(numFaces * 3)
      : new Uint16Array(numFaces * 3);
    const faceArr = new draco.DracoInt32Array();
    for (let i = 0; i < numFaces; i++) {
      decoder.GetFaceFromMesh(mesh, i, faceArr);
      indices[i*3]     = faceArr.GetValue(0);
      indices[i*3 + 1] = faceArr.GetValue(1);
      indices[i*3 + 2] = faceArr.GetValue(2);
    }
    draco.destroy(faceArr);
    draco.destroy(mesh);
    draco.destroy(buf);
    draco.destroy(decoder);

    return { positions, indices };
  }

  // ========================== triangle extraction ==========================

  async function extractTriangles(glb, options) {
    const { json, binBytes } = glb;
    const triangles = [];

    const scenes = json.scenes || [];
    const nodes  = json.nodes  || [];
    const meshes = json.meshes || [];

    const sceneIdx = json.scene != null ? json.scene : 0;
    const scene = scenes[sceneIdx];
    if (!scene || !scene.nodes) return triangles;

    // Build root matrix: optional Y-up -> Z-up rotation, then optional scale.
    let root = identity();
    if (options.rotateYupToZup) {
      // +90° around X — (x, y, z) -> (x, -z, y)
      root = new Float32Array([
        1, 0, 0, 0,
        0, 0, 1, 0,
        0,-1, 0, 0,
        0, 0, 0, 1
      ]);
    }
    if (options.scale && options.scale !== 1) {
      const s = options.scale;
      const sm = new Float32Array([
        s,0,0,0, 0,s,0,0, 0,0,s,0, 0,0,0,1
      ]);
      root = mul(sm, root);
    }

    async function walk(nodeIdx, parent) {
      const node = nodes[nodeIdx];
      const world = mul(parent, nodeMatrix(node));

      if (node.mesh !== undefined) {
        const mesh = meshes[node.mesh];
        for (const prim of mesh.primitives) {
          const mode = prim.mode == null ? 4 : prim.mode;
          if (mode !== 4) continue; // only TRIANGLES

          let positions, indices = null;
          if (prim.extensions && prim.extensions.KHR_draco_mesh_compression) {
            const dec = await decodeDraco(prim, json, binBytes);
            positions = dec.positions;
            indices = dec.indices;
          } else {
            const posIdx = prim.attributes && prim.attributes.POSITION;
            if (posIdx === undefined) continue;
            positions = readAccessor(json, posIdx, binBytes);
            if (prim.indices !== undefined) indices = readAccessor(json, prim.indices, binBytes);
          }

          const triCount = indices ? indices.length / 3 : positions.length / 9;
          for (let i = 0; i < triCount; i++) {
            const i0 = indices ? indices[i*3]     : i*3;
            const i1 = indices ? indices[i*3 + 1] : i*3 + 1;
            const i2 = indices ? indices[i*3 + 2] : i*3 + 2;
            triangles.push({
              a: transformPoint(world, [positions[i0*3], positions[i0*3+1], positions[i0*3+2]]),
              b: transformPoint(world, [positions[i1*3], positions[i1*3+1], positions[i1*3+2]]),
              c: transformPoint(world, [positions[i2*3], positions[i2*3+1], positions[i2*3+2]])
            });
          }
        }
      }

      if (node.children) {
        for (const childIdx of node.children) await walk(childIdx, world);
      }
    }

    for (const rootIdx of scene.nodes) await walk(rootIdx, root);
    return triangles;
  }

  // ============================== STL ======================================

  function exportSTL(triangles) {
    const buf = new ArrayBuffer(80 + 4 + triangles.length * 50);
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);

    const header = new TextEncoder().encode('3D Model Extractor STL — ' + new Date().toISOString());
    u8.set(header.subarray(0, 80));

    dv.setUint32(80, triangles.length, true);

    let p = 84;
    for (const t of triangles) {
      const [ax,ay,az] = t.a, [bx,by,bz] = t.b, [cx,cy,cz] = t.c;
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy*vz - uz*vy;
      let ny = uz*vx - ux*vz;
      let nz = ux*vy - uy*vx;
      const len = Math.hypot(nx, ny, nz);
      if (len > 1e-9) { nx /= len; ny /= len; nz /= len; } else { nx = ny = nz = 0; }

      dv.setFloat32(p, nx, true); p += 4;
      dv.setFloat32(p, ny, true); p += 4;
      dv.setFloat32(p, nz, true); p += 4;
      dv.setFloat32(p, ax, true); p += 4;
      dv.setFloat32(p, ay, true); p += 4;
      dv.setFloat32(p, az, true); p += 4;
      dv.setFloat32(p, bx, true); p += 4;
      dv.setFloat32(p, by, true); p += 4;
      dv.setFloat32(p, bz, true); p += 4;
      dv.setFloat32(p, cx, true); p += 4;
      dv.setFloat32(p, cy, true); p += 4;
      dv.setFloat32(p, cz, true); p += 4;
      dv.setUint16(p, 0, true); p += 2;
    }
    return u8;
  }

  // ============================== ZIP + 3MF ================================

  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function buildZip(files) {
    const enc = new TextEncoder();
    const records = [];
    let localSize = 0;
    let centralSize = 0;

    for (const f of files) {
      const nameBytes = enc.encode(f.name);
      const crc = crc32(f.data);
      records.push({ nameBytes, data: f.data, crc, offset: localSize });
      localSize += 30 + nameBytes.length + f.data.length;
      centralSize += 46 + nameBytes.length;
    }

    const out = new Uint8Array(localSize + centralSize + 22);
    const dv = new DataView(out.buffer);
    let p = 0;

    for (const r of records) {
      dv.setUint32(p,    0x04034b50, true);
      dv.setUint16(p+4,  20, true);
      dv.setUint16(p+6,  0, true);
      dv.setUint16(p+8,  0, true);            // store (no compression)
      dv.setUint16(p+10, 0, true);
      dv.setUint16(p+12, 0x21, true);         // 1980-01-01
      dv.setUint32(p+14, r.crc, true);
      dv.setUint32(p+18, r.data.length, true);
      dv.setUint32(p+22, r.data.length, true);
      dv.setUint16(p+26, r.nameBytes.length, true);
      dv.setUint16(p+28, 0, true);
      p += 30;
      out.set(r.nameBytes, p); p += r.nameBytes.length;
      out.set(r.data, p);      p += r.data.length;
    }

    const centralStart = p;
    for (const r of records) {
      dv.setUint32(p,    0x02014b50, true);
      dv.setUint16(p+4,  20, true);
      dv.setUint16(p+6,  20, true);
      dv.setUint16(p+8,  0, true);
      dv.setUint16(p+10, 0, true);
      dv.setUint16(p+12, 0, true);
      dv.setUint16(p+14, 0x21, true);
      dv.setUint32(p+16, r.crc, true);
      dv.setUint32(p+20, r.data.length, true);
      dv.setUint32(p+24, r.data.length, true);
      dv.setUint16(p+28, r.nameBytes.length, true);
      dv.setUint16(p+30, 0, true);
      dv.setUint16(p+32, 0, true);
      dv.setUint16(p+34, 0, true);
      dv.setUint16(p+36, 0, true);
      dv.setUint32(p+38, 0, true);
      dv.setUint32(p+42, r.offset, true);
      p += 46;
      out.set(r.nameBytes, p); p += r.nameBytes.length;
    }
    const centralBytes = p - centralStart;

    dv.setUint32(p,    0x06054b50, true);
    dv.setUint16(p+4,  0, true);
    dv.setUint16(p+6,  0, true);
    dv.setUint16(p+8,  records.length, true);
    dv.setUint16(p+10, records.length, true);
    dv.setUint32(p+12, centralBytes, true);
    dv.setUint32(p+16, centralStart, true);
    dv.setUint16(p+20, 0, true);

    return out;
  }

  function exportThreeMF(triangles) {
    // Dedup vertices by rounded coords.
    const map = new Map();
    const vertices = [];
    function vidx(v) {
      const k = v[0].toFixed(6) + ',' + v[1].toFixed(6) + ',' + v[2].toFixed(6);
      let i = map.get(k);
      if (i === undefined) {
        i = vertices.length;
        vertices.push(v);
        map.set(k, i);
      }
      return i;
    }
    const tris = new Array(triangles.length);
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      tris[i] = [vidx(t.a), vidx(t.b), vidx(t.c)];
    }

    const chunks = [
      '<?xml version="1.0" encoding="UTF-8"?>\n',
      '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n',
      '  <resources>\n',
      '    <object id="1" type="model">\n',
      '      <mesh>\n',
      '        <vertices>\n'
    ];
    for (const v of vertices) {
      chunks.push('          <vertex x="' + v[0].toFixed(6) + '" y="' + v[1].toFixed(6) + '" z="' + v[2].toFixed(6) + '"/>\n');
    }
    chunks.push('        </vertices>\n        <triangles>\n');
    for (const t of tris) {
      chunks.push('          <triangle v1="' + t[0] + '" v2="' + t[1] + '" v3="' + t[2] + '"/>\n');
    }
    chunks.push('        </triangles>\n      </mesh>\n    </object>\n  </resources>\n  <build>\n    <item objectid="1"/>\n  </build>\n</model>\n');
    const modelXml = chunks.join('');

    const contentTypes =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
      '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
      '  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n' +
      '</Types>\n';

    const rels =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
      '  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n' +
      '</Relationships>\n';

    const enc = new TextEncoder();
    return buildZip([
      { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
      { name: '_rels/.rels',          data: enc.encode(rels) },
      { name: '3D/3dmodel.model',     data: enc.encode(modelXml) }
    ]);
  }

  // ============================== top-level ================================

  async function convertGlb(url, format, options) {
    const opts = Object.assign({ rotateYupToZup: true, scale: 1000 }, options || {});

    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
    const buf = await resp.arrayBuffer();

    const glb = parseGLB(buf);

    // Surface obvious unsupported extensions early.
    const required = glb.json.extensionsRequired || [];
    const supported = ['KHR_draco_mesh_compression', 'KHR_texture_basisu', 'KHR_materials_unlit', 'KHR_lights_punctual'];
    const unsupported = required.filter((e) => !supported.includes(e));
    if (unsupported.length) {
      throw new Error('GLB uses unsupported extensions: ' + unsupported.join(', '));
    }

    const triangles = await extractTriangles(glb, opts);
    if (triangles.length === 0) throw new Error('No triangles extracted (empty model or unsupported primitive types).');

    let bytes;
    if (format === 'stl') bytes = exportSTL(triangles);
    else if (format === '3mf') bytes = exportThreeMF(triangles);
    else throw new Error('Unsupported target format: ' + format);

    return { bytes, triangleCount: triangles.length };
  }

  global.GLBConverter = { convertGlb, parseGLB, extractTriangles, exportSTL, exportThreeMF };
})(typeof window !== 'undefined' ? window : self);
