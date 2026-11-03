import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#07151d');
scene.fog = new THREE.Fog('#07151d', 42, 180);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 12, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight('#dfeeff', '#10232e', 1.5);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight('#fff3cc', 1.6);
sun.position.set(34, 50, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
scene.add(sun);

const keys = {};
const clock = new THREE.Clock();

const ui = {
  health: document.getElementById('health'),
  cash: document.getElementById('cash'),
  wanted: document.getElementById('wanted'),
  objective: document.getElementById('objective'),
  message: document.getElementById('message'),
  restartBtn: document.getElementById('restartBtn'),
};

const world = {
  size: 110,
  pickupGoal: 5,
  safehousePos: new THREE.Vector3(0, 0.7, 0),
  pickups: [],
  police: [],
  gameOver: false,
  won: false,
};

const player = {
  mesh: null,
  velocity: 0,
  heading: 0,
  health: 100,
  cash: 0,
  wanted: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createGround() {
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: '#16313d',
    roughness: 0.95,
    metalness: 0.08,
  });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: '#1a2128',
    roughness: 0.9,
    metalness: 0.08,
  });

  const roadWidth = 10;
  const roadLength = 120;

  for (let i = -5; i <= 5; i += 1) {
    const roadX = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.12, roadLength), roadMaterial);
    roadX.position.set(i * 18, 0.06, 0);
    roadX.receiveShadow = true;
    scene.add(roadX);

    const roadZ = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.12, roadWidth), roadMaterial);
    roadZ.position.set(0, 0.06, i * 18);
    roadZ.receiveShadow = true;
    scene.add(roadZ);
  }

  const centerGlow = new THREE.Mesh(
    new THREE.CircleGeometry(10, 48),
    new THREE.MeshBasicMaterial({ color: '#0bf0ff', transparent: true, opacity: 0.26 })
  );
  centerGlow.rotation.x = -Math.PI / 2;
  centerGlow.position.set(0, 0.12, 0);
  scene.add(centerGlow);
}

function createBuilding(width, depth, height, color, x, z) {
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.1,
      roughness: 0.75,
      metalness: 0.2,
    })
  );

  building.position.set(x, height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  scene.add(building);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: '#90d8ff',
    emissive: '#7dd3fc',
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0.7,
  });

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.2), windowMaterial);
      windowMesh.position.set(
        x - width / 2 + 1.8 + col * 2,
        height * 0.2 + row * 1.5,
        z + depth / 2 + 0.11
      );
      scene.add(windowMesh);

      const windowMeshBack = windowMesh.clone();
      windowMeshBack.position.z = z - depth / 2 - 0.11;
      scene.add(windowMeshBack);
    }
  }
}

function buildCity() {
  const buildingColors = ['#193248', '#243b4d', '#2b4353', '#2a3c4a', '#1c2f40'];
  const positions = [
    [-36, -28], [-18, -36], [18, -30], [36, -18],
    [-42, 18], [-25, 30], [8, 38], [36, 28],
    [-30, 44], [30, 48], [-44, -8], [44, 8],
  ];

  positions.forEach(([x, z], index) => {
    const size = 7 + (index % 3) * 2;
    const height = 8 + (index % 4) * 7;
    createBuilding(size, size, height, buildingColors[index % buildingColors.length], x, z);
  });

  const safehouse = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(11, 1.2, 11),
    new THREE.MeshStandardMaterial({ color: '#1a3036', metalness: 0.3, roughness: 0.7 })
  );
  base.position.y = 0.6;
  safehouse.add(base);

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(8, 6, 8),
    new THREE.MeshStandardMaterial({ color: '#d4a85c', emissive: '#ffc56d', emissiveIntensity: 0.2 })
  );
  building.position.y = 3.6;
  safehouse.add(building);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 1.2, 0.35),
    new THREE.MeshStandardMaterial({ color: '#0df2ff', emissive: '#31d6ff', emissiveIntensity: 0.9 })
  );
  sign.position.set(0, 4.2, 4.2);
  safehouse.add(sign);

  safehouse.position.set(world.safehousePos.x, 0, world.safehousePos.z);
  safehouse.castShadow = true;
  safehouse.receiveShadow = true;
  scene.add(safehouse);

  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: '#26d0ff', transparent: true, opacity: 0.25 })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(0, 0.18, 0);
  scene.add(halo);
}

function createCar(color, accent = '#fefefe', isPolice = false) {
  const car = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.45,
    emissive: color,
    emissiveIntensity: 0.12,
  });

  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 4.4), bodyMaterial);
  mainBody.position.y = 0.8;
  mainBody.castShadow = true;
  car.add(mainBody);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.9, 2.2),
    new THREE.MeshStandardMaterial({
      color: '#b8d8ff',
      metalness: 0.25,
      roughness: 0.3,
      transparent: true,
      opacity: 0.85,
    })
  );
  cabin.position.set(0, 1.4, -0.2);
  car.add(cabin);

  const wheelGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.5, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#10181c', roughness: 0.9 });

  const wheelOffsets = [
    [-1.15, 0.35, 1.45],
    [1.15, 0.35, 1.45],
    [-1.15, 0.35, -1.45],
    [1.15, 0.35, -1.45],
  ];

  wheelOffsets.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    car.add(wheel);
  });

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.2,
  });

  const frontLightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.5), lightMaterial);
  frontLightLeft.position.set(-0.7, 0.9, 2.2);
  car.add(frontLightLeft);

  const frontLightRight = frontLightLeft.clone();
  frontLightRight.position.x = 0.7;
  car.add(frontLightRight);

  if (isPolice) {
    const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: '#42c0ff', emissive: '#42c0ff', emissiveIntensity: 1.6 }));
    blueLight.position.set(-0.7, 1.7, 1.9);
    car.add(blueLight);

    const redLight = blueLight.clone();
    redLight.material = new THREE.MeshStandardMaterial({ color: '#ff4d4d', emissive: '#ff4d4d', emissiveIntensity: 1.6 });
    redLight.position.x = 0.7;
    car.add(redLight);
  }

  return car;
}

function createPlayer() {
  const mesh = createCar('#36d1ff', '#d7f9ff');
  mesh.position.set(-30, 0, 32);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
  player.mesh = mesh;
}

function spawnPickups() {
  world.pickups.forEach((pickup) => scene.remove(pickup.mesh));
  world.pickups = [];

  const spawnPoints = [
    new THREE.Vector3(-42, 0.7, 48),
    new THREE.Vector3(-20, 0.7, -42),
    new THREE.Vector3(36, 0.7, -12),
    new THREE.Vector3(48, 0.7, 32),
    new THREE.Vector3(18, 0.7, 46),
    new THREE.Vector3(-48, 0.7, 8),
    new THREE.Vector3(8, 0.7, -48),
    new THREE.Vector3(0, 0.7, 48),
    new THREE.Vector3(-8, 0.7, -14),
    new THREE.Vector3(32, 0.7, 10),
  ];

  spawnPoints.forEach((position, index) => {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({
        color: '#ffd166',
        emissive: '#ffd166',
        emissiveIntensity: 0.7,
        metalness: 0.3,
        roughness: 0.25,
      })
    );
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.userData.value = 500 + index * 100;
    scene.add(mesh);
    world.pickups.push({ mesh, value: mesh.userData.value, active: true });
  });
}

function spawnPolice() {
  world.police.forEach((police) => scene.remove(police.mesh));
  world.police = [];

  const patrolSpawns = [
    new THREE.Vector3(-40, 0, -20),
    new THREE.Vector3(44, 0, 26),
    new THREE.Vector3(14, 0, -40),
  ];

  patrolSpawns.forEach((position, index) => {
    const mesh = createCar('#1d2432', '#ffffff', true);
    mesh.position.copy(position);
    mesh.rotation.y = index % 2 === 0 ? 0 : Math.PI;
    scene.add(mesh);
    world.police.push({
      mesh,
      speed: 14 + index * 1.5,
      offset: Math.random() * Math.PI * 2,
      turnPhase: 0,
    });
  });
}

function setObjectiveText() {
  const remaining = Math.max(0, world.pickupGoal - Math.round(player.cash / 500));

  if (world.won) {
    ui.objective.textContent = 'Mission complete';
    return;
  }

  if (world.gameOver) {
    ui.objective.textContent = 'Busted — restart';
    return;
  }

  if (player.cash < 2500) {
    ui.objective.textContent = `Collect ${Math.max(0, Math.ceil((2500 - player.cash) / 500))} cash drops`;
  } else {
    ui.objective.textContent = 'Reach the safehouse';
  }
}

function updateHud() {
  ui.health.textContent = `${Math.max(0, Math.round(player.health))}`;
  ui.cash.textContent = `$${Math.round(player.cash)}`;
  ui.wanted.textContent = `${Math.min(5, player.wanted)}`;
  setObjectiveText();
}

function resetGame() {
  world.gameOver = false;
  world.won = false;
  player.health = 100;
  player.cash = 0;
  player.wanted = 0;
  player.velocity = 0;
  player.heading = 0;

  if (player.mesh) {
    player.mesh.position.set(-30, 0, 32);
    player.mesh.rotation.y = Math.PI / 2;
    player.mesh.rotation.x = 0;
  }

  spawnPickups();
  spawnPolice();
  ui.message.textContent = 'WASD/Arrow keys drive • Reach the safehouse with $2500';
  ui.restartBtn.classList.remove('visible');
  updateHud();
}

function handlePickups() {
  world.pickups.forEach((pickup) => {
    if (!pickup.active) return;

    const distance = pickup.mesh.position.distanceTo(player.mesh.position);
    if (distance < 3.2) {
      pickup.mesh.visible = false;
      pickup.active = false;
      player.cash += pickup.value;
      player.wanted = clamp(Math.floor(player.cash / 750) + 1, 0, 5);
      ui.message.textContent = `Cash secured: $${Math.round(player.cash)}`;
      updateHud();
    } else {
      pickup.mesh.rotation.y += 0.08;
      pickup.mesh.position.y = 0.7 + Math.sin((performance.now() * 0.003) + pickup.mesh.position.x) * 0.25;
    }
  });
}

function handlePolice(dt) {
  world.police.forEach((policeCar) => {
    const direction = player.mesh.position.clone().sub(policeCar.mesh.position);
    const distance = direction.length();
    if (distance > 0.001) {
      const desiredAngle = Math.atan2(direction.x, direction.z);
      const angleDelta = THREE.MathUtils.euclideanModulo(desiredAngle - policeCar.mesh.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      policeCar.mesh.rotation.y += angleDelta * 0.08;
      const chaseSpeed = 10 + player.wanted * 4;
      const moveAmount = chaseSpeed * dt;
      policeCar.mesh.position.x += Math.sin(policeCar.mesh.rotation.y) * moveAmount;
      policeCar.mesh.position.z += Math.cos(policeCar.mesh.rotation.y) * moveAmount;

      if (distance < 5.5) {
        player.health -= 18 * dt;
        player.wanted = clamp(player.wanted + 1, 0, 5);
      }
    }
  });
}

function updatePlayer(dt) {
  const forward = keys['KeyW'] || keys['ArrowUp'];
  const backward = keys['KeyS'] || keys['ArrowDown'];
  const left = keys['KeyA'] || keys['ArrowLeft'];
  const right = keys['KeyD'] || keys['ArrowRight'];

  const acceleration = forward ? 21 : backward ? -16 : 0;
  const steerInput = (left ? 1 : 0) - (right ? 1 : 0);

  if (Math.abs(player.velocity) > 0.01 || acceleration !== 0) {
    player.velocity += acceleration * dt;
  }

  if (!forward && !backward) {
    player.velocity *= 0.96;
  }

  player.velocity = clamp(player.velocity, -10, 30);
  player.heading += steerInput * dt * (0.7 + Math.abs(player.velocity) * 0.06);
  player.mesh.rotation.y = player.heading;

  if (Math.abs(player.velocity) > 0.05) {
    const direction = new THREE.Vector3(Math.sin(player.mesh.rotation.y), 0, Math.cos(player.mesh.rotation.y));
    player.mesh.position.addScaledVector(direction, player.velocity * dt);
  }

  player.mesh.position.x = clamp(player.mesh.position.x, -48, 48);
  player.mesh.position.z = clamp(player.mesh.position.z, -48, 48);

  if (player.cash >= 2500) {
    const safehouseDistance = player.mesh.position.distanceTo(world.safehousePos);
    if (safehouseDistance < 8.5) {
      world.won = true;
      ui.message.textContent = 'Heist successful! You escaped with the cash.';
      ui.restartBtn.classList.add('visible');
      updateHud();
    }
  }

  if (player.health <= 0) {
    world.gameOver = true;
    ui.message.textContent = 'You were busted. Hit restart to try again.';
    ui.restartBtn.classList.add('visible');
    updateHud();
  }
}

function updateCamera(dt) {
  const target = player.mesh.position.clone().add(new THREE.Vector3(0, 3.4, 0));
  const lookAhead = new THREE.Vector3(Math.sin(player.mesh.rotation.y), 0, Math.cos(player.mesh.rotation.y));
  const behind = lookAhead.clone().multiplyScalar(-12);
  const desiredPos = target.clone().add(new THREE.Vector3(behind.x, 7.5, behind.z));
  camera.position.lerp(desiredPos, 1 - Math.exp(-dt * 4));
  camera.lookAt(target.clone().add(lookAhead.multiplyScalar(8)));
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  if (!world.gameOver && !world.won) {
    updatePlayer(dt);
    handlePickups();
    handlePolice(dt);
    player.health = clamp(player.health + 0.2 * dt, 0, 100);
    player.wanted = clamp(player.wanted, 0, 5);
    updateHud();
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if ((event.code === 'KeyR' || event.code === 'Enter') && (world.gameOver || world.won)) {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

ui.restartBtn.addEventListener('click', () => {
  resetGame();
});

createGround();
buildCity();
createPlayer();
resetGame();
animate();
