// ============================================
// 第1部分：导入必要的库
// ============================================


import * as THREE from 'three';  // Three.js核心库
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';  // 第一人称控制器

// ============================================
// 第2部分：创建场景、相机、渲染器（3D世界的三大件）
// ============================================

// 2.1 创建场景（类似一个空房间）
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccff); // 设置天空蓝背景

// 2.2 创建相机（类似人的眼睛）
const camera = new THREE.PerspectiveCamera(
    75,                         // 视野角度（75度，类似人眼）
    window.innerWidth / window.innerHeight, // 宽高比
    0.1,                        // 最近能看到多近
    1000                        // 最远能看到多远
);
camera.position.y = 1.7; // 模拟人的眼睛高度（1.7米）

// 2.3 创建渲染器（把3D世界画到屏幕上）
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight); // 设置画布大小
renderer.shadowMap.enabled = true; // 开启阴影效果
document.body.appendChild(renderer.domElement); // 把画布添加到网页上

// ============================================
// 第3部分：添加物体（让场景有东西看）
// ============================================

// 3.1 创建地面
const groundGeometry = new THREE.PlaneGeometry(20, 20); // 20x20米的地面
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2c3e50, 
    side: THREE.DoubleSide // 双面渲染，从下面也能看到
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // 旋转使其水平（默认是竖着的）
ground.position.y = -0.01; // 稍微下沉一点，避免和网格重叠闪烁
ground.receiveShadow = true; // 接收阴影
scene.add(ground); // 把地面放到场景中

// 3.2 添加网格辅助线（方便看到移动和位置）
const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
scene.add(gridHelper);

// --- 加载 3D 模型 ---
// 1. 创建一个加载器实例
const loader = new GLTFLoader();

// 2. 加载模型文件
// 第一个参数是模型文件的路径
// 第二个参数是加载成功后的回调函数
loader.load(
    'models/Head727.glb', // 替换成你的模型文件路径
    (gltf) => {
        // 加载成功，将模型添加到场景中
        const model = gltf.scene;
        model.position.set(0, 2, 0);
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

// 3.3 添加一些彩色方块作为参照物
const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
for (let i = 0; i < 10; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), boxMaterial);
    // 让方块围成一个圆圈
    const angle = (i / 10) * Math.PI * 2;
    const radius = 3 + Math.random() * 2;
    box.position.set(
        Math.cos(angle) * radius, // x坐标
        0.25,                     // y坐标（抬离地面）
        Math.sin(angle) * radius  // z坐标
    );
    box.castShadow = true;  // 投射阴影
    box.receiveShadow = true; // 接收阴影
    scene.add(box);
}

// 3.4 添加灯光（没有灯光，物体是黑色的）
const ambientLight = new THREE.AmbientLight(0x404060); // 环境光（提供基础照明）
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1); // 方向光（模拟太阳）
dirLight.position.set(5, 10, 7); // 从斜上方照射
dirLight.castShadow = true;
scene.add(dirLight);

// ============================================
// 第4部分：设置第一人称控制器（核心！）
// ============================================

const controls = new PointerLockControls(camera, renderer.domElement);

// 点击屏幕时锁定鼠标指针（进入第一人称模式）
renderer.domElement.addEventListener('click', () => {
    controls.lock();
});

// 锁定成功时的提示
controls.addEventListener('lock', () => {
    console.log('✅ 已进入第一人称模式！使用 WASD 移动，鼠标环顾');
    document.getElementById('info').style.display = 'none'; // 隐藏提示文字
});

// 解锁时的提示（按 ESC 键退出）
controls.addEventListener('unlock', () => {
    console.log('⏸️ 已退出第一人称模式');
    document.getElementById('info').style.display = 'block'; // 重新显示提示
});

// ============================================
// 第5部分：键盘监听（检测WASD是否被按下）
// ============================================

// 用对象记录每个按键的状态
const keyState = {
    w: false, 
    a: false, 
    s: false, 
    d: false
};

// 当按键被按下时，记录状态
document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': keyState.w = true; break;
        case 'KeyA': keyState.a = true; break;
        case 'KeyS': keyState.s = true; break;
        case 'KeyD': keyState.d = true; break;
        default: break;
    }
});

// 当按键被松开时，更新状态
document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': keyState.w = false; break;
        case 'KeyA': keyState.a = false; break;
        case 'KeyS': keyState.s = false; break;
        case 'KeyD': keyState.d = false; break;
        default: break;
    }
});

// ============================================
// 第6部分：游戏循环（让场景动起来）
// ============================================

const clock = new THREE.Clock(); // 用于计算时间差

function animate() {
    const delta = clock.getDelta(); // 上一帧到这一帧的时间间隔
    const speed = 10.0; // 移动速度（米/秒）

    // 只有当鼠标被锁定时，才响应WASD移动
    if (controls.isLocked) {
        // 计算"向前"的方向（基于相机当前朝向）
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; // 保持水平移动（不飞起来）
        forward.normalize(); // 归一化（长度为1）

        // 计算"向右"的方向
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();

        // 根据按键组合计算移动方向
        const moveDelta = new THREE.Vector3(0, 0, 0);
        if (keyState.w) moveDelta.add(forward);  // 向前
        if (keyState.s) moveDelta.sub(forward);  // 向后
        if (keyState.d) moveDelta.add(right);    // 向右
        if (keyState.a) moveDelta.sub(right);    // 向左

        // 如果有移动，则应用移动
        if (moveDelta.lengthSq() > 0) {
            moveDelta.normalize().multiplyScalar(speed * delta);
            camera.position.add(moveDelta);
        }
    }

    // 渲染场景
    renderer.render(scene, camera);
    requestAnimationFrame(animate); // 请求下一帧
}

animate(); // 启动游戏循环

// ============================================
// 第7部分：窗口自适应（当你改变窗口大小时）
// ============================================

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}