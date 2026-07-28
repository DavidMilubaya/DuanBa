import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// --- 场景、相机、渲染器 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccff);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- 地面和网格 ---
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


const loader = new GLTFLoader();

loader.load(
    'models/Head727.glb', // 替换成你的模型文件路径
    (gltf) => {
        // 加载成功，将模型添加到场景中
        const model = gltf.scene;
        model.position.set(0, 2, -3);
        model.scale.set(0.8, 0.8, 0.8);
        scene.add(model);
        console.log('模型加载成功！');
    },
    (xhr) => {
        // 加载进度回调 (可选)
        console.log((xhr.loaded / xhr.total * 100) + '% 已加载');
    },
    (error) => {
        // 加载失败回调
        console.error('模型加载失败:', error);
    }
);

// --- 灯光 ---
scene.add(new THREE.AmbientLight(0x404060));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// --- 自定义视角控制 ---
let pitch = 0;
let yaw = 0;
const pitchLimit = Math.PI / 2 - 0.1;
camera.rotation.order = 'YXZ';

function updateCameraRotation() {
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

let isPointerDown = false;
//点击锁定鼠标移动
let isCoolingDown = false; // 冷却中
let isLocked = false;
let prevPointerX = 0, prevPointerY = 0;


renderer.domElement.addEventListener('click', () => {
    if (isLocked || isCoolingDown) return; // 已锁定或冷却中，不处理
    renderer.domElement.requestPointerLock().catch(err => {
        // 如果仍然发生错误，可在此忽略
        console.warn('锁定请求被拒绝:', err);
    });
});
// 2. 监听锁定状态变化
document.addEventListener('pointerlockchange', () => {
    isLocked = !!document.pointerLockElement; // 如果锁定元素存在则为 true，否则 false

    const info = document.getElementById('info');
    if (!isLocked) {
        isCoolingDown = true;
        setTimeout(() => {
            isCoolingDown = false;
        }, 300); // 300ms 冷却时间，足够避免错误
        info.textContent = '🖱️ 点击屏幕锁定鼠标 | WASD 移动';
    } else {
        info.textContent = '🖱️ 鼠标移动环顾 | WASD 移动';
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    yaw -= dx * 0.002;      // 灵敏度系数可调
    pitch -= dy * 0.002;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    updateCameraRotation();  // 你已有的旋转更新函数
});


renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isPointerDown = true;
        prevPointerX = e.touches[0].clientX;
        prevPointerY = e.touches[0].clientY;
    }
}, { passive: true });
renderer.domElement.addEventListener('touchmove', (e) => {
    if (!isPointerDown || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - prevPointerX;
    const dy = e.touches[0].clientY - prevPointerY;
    yaw -= dx * 0.005;
    pitch -= dy * 0.005;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    updateCameraRotation();
    prevPointerX = e.touches[0].clientX;
    prevPointerY = e.touches[0].clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchend', () => { isPointerDown = false; }, { passive: true });

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


// 获取摇杆元素
const joystickArea = document.getElementById('joystick-area');
const joystickKnob = document.getElementById('joystick-knob');

// 摇杆状态
let joystickActive = false;
let joystickDelta = { x: 0, z: 0 };  // 范围 -1 ~ 1

// 摇杆半径（像素）
const joystickRadius = 50; // 外圈半径
const knobRadius = 25;      // 内圈半径

function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
    const touch = e.touches[0];
    updateJoystickPosition(touch);
}

function handleJoystickMove(e) {
    e.preventDefault();
    if (!joystickActive) return;
    const touch = e.touches[0];
    updateJoystickPosition(touch);
}

function handleJoystickEnd(e) {
    e.preventDefault();
    joystickActive = false;
    // 重置摇杆
    joystickDelta = { x: 0, z: 0 };
    joystickKnob.style.transform = 'translate(-50%, -50%)';
}

function updateJoystickPosition(touch) {
    const rect = joystickArea.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 计算触摸点相对于中心的偏移（像素）
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;

    // 限制距离在半径内
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = joystickRadius - knobRadius; // 内圈可移动最大距离
    let clampedDx = dx;
    let clampedDy = dy;
    if (distance > maxDist) {
        clampedDx = (dx / distance) * maxDist;
        clampedDy = (dy / distance) * maxDist;
    }

    // 移动摇杆内圈
    joystickKnob.style.transform = `translate(${-50 + (clampedDx / rect.width) * 100}%, ${-50 + (clampedDy / rect.height) * 100}%)`;

    // 计算方向向量（归一化到 -1 ~ 1）
    // 注意：屏幕坐标 Y 向下，但游戏坐标 Z 向前，所以取反
    const normX = clampedDx / maxDist;
    const normZ = -clampedDy / maxDist;  // 向上拖拽 => 向前（Z负方向）
    joystickDelta = { x: normX, z: normZ };
}

// 绑定事件
joystickArea.addEventListener('touchstart', handleJoystickStart, { passive: false });
joystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });
joystickArea.addEventListener('touchend', handleJoystickEnd, { passive: false });
joystickArea.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

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

    // --- 合并键盘和摇杆输入 ---
    let moveX = 0, moveZ = 0;

    // 键盘输入 (WASD)
    if (keyState.w) moveZ += 1;
    if (keyState.s) moveZ -= 1;
    if (keyState.a) moveX -= 1;
    if (keyState.d) moveX += 1;

    // 摇杆输入 (触摸)
    moveX += joystickDelta.x;
    moveZ += joystickDelta.z;

    // 限制最大幅度为1（避免对角线加速）
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 1) {
        moveX /= len;
        moveZ /= len;
    }

    // 只有当存在有效输入时才移动
    if (len > 0.01) {
        const moveDelta = new THREE.Vector3(0, 0, 0);
        // 注意：forward 方向是 -Z，所以 moveZ 为负时向前
        moveDelta.addScaledVector(right, moveX * speed * delta);
        moveDelta.addScaledVector(forward, moveZ * speed * delta);
        camera.position.add(moveDelta);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// --- 窗口自适应 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('游戏已启动！拖拽旋转视角，WASD 移动。');
