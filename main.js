import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 场景 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xCD5C5C );

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- 地面 ---
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);
scene.add(new THREE.GridHelper(20, 20, 0x888888, 0x444444));

// --- 方块参照物 ---
const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
for (let i = 0; i < 10; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), boxMaterial);
    const angle = (i / 10) * Math.PI * 2;
    const radius = 3 + Math.random() * 2;
    box.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
}

// --- 模型加载 ---
const loader = new GLTFLoader();
loader.load(
    'models/Head727.glb',
    (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 2, -3);
        model.scale.set(0.8, 0.8, 0.8);
        scene.add(model);
        console.log('模型加载成功！');
    },
    (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% 已加载'); },
    (error) => { console.error('模型加载失败:', error); }
);

// --- 灯光 ---
scene.add(new THREE.AmbientLight(0x404060));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// --- 视角旋转控制 ---
let pitch = 0;
let yaw = 0;
const pitchLimit = Math.PI / 2 - 0.1;
camera.rotation.order = 'YXZ';

function updateCameraRotation() {
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

// ---- 桌面鼠标锁定 ----
let isCoolingDown = false;
let isLocked = false;
renderer.domElement.addEventListener('click', () => {
    if (isLocked || isCoolingDown) return;
    renderer.domElement.requestPointerLock().catch(() => { });
});
document.addEventListener('pointerlockchange', () => {
    isLocked = !!document.pointerLockElement;
    const info = document.getElementById('info');
    if (!isLocked) {
        isCoolingDown = true;
        setTimeout(() => { isCoolingDown = false; }, 300);
        info.textContent = '🕹️ 摇杆移动 · 滑动视角';
    } else {
        info.textContent = '🖱️ 鼠标拖拽环顾 · WASD 移动';
    }
});
document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    updateCameraRotation();
});

// ===== 多点触摸视角控制（画布） =====
let viewTouchId = null;
let viewPrevX = 0, viewPrevY = 0;

renderer.domElement.addEventListener('touchstart', (e) => {
    if (viewTouchId !== null) return;
    const touch = e.changedTouches[0];
    if (touch) {
        viewTouchId = touch.identifier;
        viewPrevX = touch.clientX;
        viewPrevY = touch.clientY;
    }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (viewTouchId === null) return;
    let activeTouch = null;
    for (const touch of e.changedTouches) {
        if (touch.identifier === viewTouchId) {
            activeTouch = touch;
            break;
        }
    }
    if (!activeTouch) return;
    const dx = activeTouch.clientX - viewPrevX;
    const dy = activeTouch.clientY - viewPrevY;
    yaw -= dx * 0.005;
    pitch -= dy * 0.005;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    updateCameraRotation();
    viewPrevX = activeTouch.clientX;
    viewPrevY = activeTouch.clientY;
}, { passive: true });

renderer.domElement.addEventListener('touchend', (e) => {
    if (viewTouchId === null) return;
    let stillExists = false;
    for (const touch of e.changedTouches) {
        if (touch.identifier === viewTouchId) {
            stillExists = true;
            break;
        }
    }
    if (!stillExists) {
        viewTouchId = null;
    }
}, { passive: true });

// --- 键盘移动 ---
const keyState = { w: false, a: false, s: false, d: false };
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': keyState.w = true; break;
        case 'KeyA': keyState.a = true; break;
        case 'KeyS': keyState.s = true; break;
        case 'KeyD': keyState.d = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': keyState.w = false; break;
        case 'KeyA': keyState.a = false; break;
        case 'KeyS': keyState.s = false; break;
        case 'KeyD': keyState.d = false; break;
    }
});

// ===== 🆕 摇杆控制（稳健版：遍历触摸点，精准识别摇杆上的手指） =====
const joystickArea = document.getElementById('joystick-area');
const joystickKnob = document.getElementById('joystick-knob');
let joystickTouchId = null;
let joystickDelta = { x: 0, z: 0 };
const maxDist = 40;

// 工具：判断触摸点是否在摇杆区域内
function isTouchInJoystick(touch) {
    const rect = joystickArea.getBoundingClientRect();
    const x = touch.clientX;
    const y = touch.clientY;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function updateJoystick(touch) {
    const rect = joystickArea.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let clampedDx = dx, clampedDy = dy;
    if (distance > maxDist) {
        clampedDx = (dx / distance) * maxDist;
        clampedDy = (dy / distance) * maxDist;
    }
    const knobOffsetX = (clampedDx / rect.width) * 100;
    const knobOffsetY = (clampedDy / rect.height) * 100;
    joystickKnob.style.transform = `translate(${-50 + knobOffsetX}%, ${-50 + knobOffsetY}%)`;
    joystickDelta.x = clampedDx / maxDist;
    joystickDelta.z = -clampedDy / maxDist;
}

function onJoystickStart(e) {
    e.preventDefault();
    if (joystickTouchId !== null) return;
    // 遍历所有触摸点，只取位于摇杆区域内的那个
    for (const touch of e.touches) {
        if (isTouchInJoystick(touch)) {
            joystickTouchId = touch.identifier;
            updateJoystick(touch);
            break;
        }
    }
}

function onJoystickMove(e) {
    e.preventDefault();
    if (joystickTouchId === null) return;
    for (const touch of e.touches) {
        if (touch.identifier === joystickTouchId) {
            updateJoystick(touch);
            break;
        }
    }
}

function onJoystickEnd(e) {
    e.preventDefault();
    if (joystickTouchId === null) return;
    for (const touch of e.changedTouches) {
        if (touch.identifier === joystickTouchId) {
            joystickTouchId = null;
            joystickDelta = { x: 0, z: 0 };
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            break;
        }
    }
}

joystickArea.addEventListener('touchstart', onJoystickStart, { passive: false });
joystickArea.addEventListener('touchmove', onJoystickMove, { passive: false });
joystickArea.addEventListener('touchend', onJoystickEnd, { passive: false });
joystickArea.addEventListener('touchcancel', onJoystickEnd, { passive: false });

// --- 动画循环 ---
const clock = new THREE.Clock();
const speed = 5.0;

function animate() {
    const delta = clock.getDelta();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    let moveX = 0, moveZ = 0;
    if (keyState.w) moveZ += 1;
    if (keyState.s) moveZ -= 1;
    if (keyState.a) moveX -= 1;
    if (keyState.d) moveX += 1;
    moveX += joystickDelta.x;
    moveZ += joystickDelta.z;

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 1) { moveX /= len; moveZ /= len; }
    if (len > 0.01) {
        const moveDelta = new THREE.Vector3(0, 0, 0);
        moveDelta.addScaledVector(right, moveX * speed * delta);
        moveDelta.addScaledVector(forward, moveZ * speed * delta);
        camera.position.add(moveDelta);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('DuanBa 已启动！多点触摸完美兼容 (摇杆 + 视角滑动互不干扰)');
