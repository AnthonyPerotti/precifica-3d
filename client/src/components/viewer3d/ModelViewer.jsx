import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function ModelViewer({ fileUrl, color = '#10b981', height = 240 }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f1723');

    const width = container.clientWidth || 300;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(60, 60, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00bcd4, 1.2);
    dirLight1.position.set(50, 100, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-50, -50, -50);
    scene.add(dirLight2);

    // Grid Floor / Print Bed
    const gridHelper = new THREE.GridHelper(100, 20, 0x00bcd4, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    let mesh = null;
    let isDisposed = false;

    // Simple default isometric test block if no URL provided
    if (!fileUrl) {
      const geo = new THREE.CylinderGeometry(15, 18, 25, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.35,
        metalness: 0.1
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 12.5;
      scene.add(mesh);
      camera.lookAt(0, 10, 0);
      setHasModel(false);
    } else {
      setLoading(true);
      fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          if (isDisposed) return;
          try {
            const geometry = parseStlGeometry(buffer);
            geometry.center();
            geometry.computeVertexNormals();

            // Place on bed
            geometry.computeBoundingBox();
            const bb = geometry.boundingBox;
            const sizeY = bb.max.y - bb.min.y;
            const maxDim = Math.max(bb.max.x - bb.min.x, sizeY, bb.max.z - bb.min.z);

            const mat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(color),
              roughness: 0.3,
              metalness: 0.15
            });

            mesh = new THREE.Mesh(geometry, mat);
            mesh.position.y = sizeY / 2;
            scene.add(mesh);

            // Fit camera
            const dist = maxDim * 2.2;
            camera.position.set(dist * 0.8, dist * 0.9, dist * 1.1);
            camera.lookAt(0, sizeY / 2, 0);
            setHasModel(true);
          } catch (e) {
            console.error('Erro ao renderizar STL:', e);
          } finally {
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Erro ao carregar modelo:', err);
          setLoading(false);
        });
    }

    // Interactive mouse rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      scene.rotation.y += deltaX * 0.01;
      scene.rotation.x += deltaY * 0.01;
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.08 : 0.92);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        scene.rotation.y += 0.004; // subtle idle rotation
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [fileUrl, color, height]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(15, 23, 35, 0.8)', color: '#00bcd4', fontSize: '0.875rem'
        }}>
          Carregando malha 3D...
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 8, right: 10, fontSize: '0.7rem', color: 'var(--text-muted)',
        pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4
      }}>
        Rotacione com o mouse
      </div>
    </div>
  );
}

// Lightweight binary and ASCII STL parser directly into BufferGeometry
function parseStlGeometry(buffer) {
  const isBinary = (buf) => {
    if (buf.byteLength < 84) return false;
    const reader = new DataView(buf);
    const count = reader.getUint32(80, true);
    return buf.byteLength === 84 + count * 50;
  };

  const geometry = new THREE.BufferGeometry();

  if (isBinary(buffer)) {
    const reader = new DataView(buffer);
    const triangleCount = reader.getUint32(80, true);
    const vertices = new Float32Array(triangleCount * 9);
    let offset = 84;
    let vIdx = 0;

    for (let i = 0; i < triangleCount; i++) {
      offset += 12; // skip normal
      for (let v = 0; v < 3; v++) {
        vertices[vIdx++] = reader.getFloat32(offset, true);
        vertices[vIdx++] = reader.getFloat32(offset + 4, true);
        vertices[vIdx++] = reader.getFloat32(offset + 8, true);
        offset += 12;
      }
      offset += 2; // attribute byte count
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  } else {
    // ASCII parser fallback
    const text = new TextDecoder().decode(buffer);
    const regex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
    const vertices = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  }

  return geometry;
}
