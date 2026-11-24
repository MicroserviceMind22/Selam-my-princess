const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start');
const playPause = document.getElementById('playPause');
const timeline = document.getElementById('timeline');
const timeLabel = document.getElementById('time');
const fullscreenButton = document.getElementById('fullscreen');
const musicFile = document.getElementById('music-file');
const musicStatus = document.getElementById('music-status');
const soundtrack = document.getElementById('soundtrack');
const muteButton = document.getElementById('mute');

const W = 1920;
const H = 1080;
const DURATION = 80;
const MUSIC_LOOP_START = 20;
const MUSIC_LOOP_END = 25;
const MUSIC_DATABASE = 'selam-film-audio';
const MUSIC_STORE = 'soundtracks';
let currentTime = 0;
let playing = false;
let lastFrame = 0;
let musicObjectUrl = null;
let musicMuted = false;
let musicIntroLooping = false;
let musicSelectionId = 0;

function openMusicDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Browser storage is unavailable.'));
      return;
    }

    const request = indexedDB.open(MUSIC_DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(MUSIC_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open browser storage.'));
  });
}

function saveMusicFile(file) {
  return openMusicDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(MUSIC_STORE, 'readwrite');
    transaction.objectStore(MUSIC_STORE).put(file, 'selected');
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      const error = transaction.error || new Error('Could not save the selected music.');
      database.close();
      reject(error);
    };
  }));
}

function loadMusicFile() {
  return openMusicDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(MUSIC_STORE, 'readonly');
    const request = transaction.objectStore(MUSIC_STORE).get('selected');
    let file = null;
    request.onsuccess = () => { file = request.result || null; };
    transaction.oncomplete = () => {
      database.close();
      resolve(file);
    };
    transaction.onabort = () => {
      const error = transaction.error || request.error || new Error('Could not load the saved music.');
      database.close();
      reject(error);
    };
  }));
}

function useMusicFile(file) {
  if (musicObjectUrl) URL.revokeObjectURL(musicObjectUrl);
  musicObjectUrl = URL.createObjectURL(file);
  musicIntroLooping = false;
  soundtrack.src = musicObjectUrl;
  soundtrack.muted = musicMuted;
  soundtrack.load();
  if (playing) playSoundtrack();
}

function restoreSavedMusic() {
  const selectionId = musicSelectionId;
  loadMusicFile().then(file => {
    if (!file || selectionId !== musicSelectionId) return;
    useMusicFile(file);
    musicStatus.textContent = `Saved music ready: ${file.name}. Press Play to start the film and music.`;
  }).catch(error => {
    console.error('Could not restore the saved soundtrack.', error);
    if (selectionId === musicSelectionId) {
      musicStatus.textContent = 'Saved music could not be loaded. Choose it again from your PC.';
    }
  });
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function line(x1, y1, x2, y2, color, width = 8) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function flower(x, y, scale, color, face = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 7;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(0, -58, 34, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#e7c25e';
  ctx.fill();
  ctx.stroke();
  if (face) {
    ctx.fillStyle = '#20170f';
    ctx.beginPath();
    ctx.ellipse(-13, -4, 7, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(13, -4, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 12, 15, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPerson(x, y, scale, dress, hair, phase = 0, crown = false, skin = '#563c2b', habeshaStyle = false, longHair = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(Math.sin(phase) * 0.035);

  const shoulderRoll = Math.sin(phase * 2.4);
  const headSlide = Math.sin(phase * 2.4 + Math.PI / 2) * 12;

  if (longHair || habeshaStyle) {
    ctx.save();
    ctx.translate(headSlide, 0);
    ctx.fillStyle = hair;
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-43, -224);
    ctx.bezierCurveTo(-91, -210, -94, -112, -77, -50);
    ctx.quadraticCurveTo(-63, -32, -49, -58);
    ctx.lineTo(-51, -147);
    ctx.closePath();
    ctx.moveTo(43, -224);
    ctx.bezierCurveTo(91, -210, 94, -112, 77, -50);
    ctx.quadraticCurveTo(63, -32, 49, -58);
    ctx.lineTo(51, -147);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (habeshaStyle) {
    ctx.save();
    ctx.translate(headSlide, 0);
    ctx.fillStyle = hair;
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 5;
    for (let x = -84; x <= 84; x += 24) {
      ctx.beginPath();
      ctx.arc(x, -252 - (Math.abs(x) % 48 ? 0 : 7), 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    for (const x of [-82, 82]) {
      for (const y of [-230, -204, -178, -152]) {
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(headSlide, 0);
  ctx.fillStyle = skin;
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, -185, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -205, 66, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (crown) {
    ctx.fillStyle = '#e4b33f';
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-52, -245);
    ctx.lineTo(-52, -296);
    ctx.lineTo(-24, -276);
    ctx.lineTo(0, -326);
    ctx.lineTo(24, -276);
    ctx.lineTo(52, -296);
    ctx.lineTo(52, -245);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9f3025';
    for (const jewelX of [-26, 0, 26]) {
      ctx.beginPath();
      ctx.arc(jewelX, -264, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.fillStyle = dress;
  ctx.beginPath();
  ctx.moveTo(-55, -115);
  ctx.quadraticCurveTo(0, -145, 55, -115);
  ctx.lineTo(95, 80);
  ctx.quadraticCurveTo(0, 115, -95, 80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (habeshaStyle) {
    ctx.fillStyle = '#a42f32';
    ctx.strokeStyle = '#d9af55';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-34, -127);
    ctx.lineTo(34, -127);
    ctx.lineTo(40, 48);
    ctx.lineTo(0, 94);
    ctx.lineTo(-40, 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e4b33f';
    for (const y of [-88, -48, -8, 32]) {
      ctx.beginPath();
      ctx.arc(0, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = '#a42f32';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(0, -117, 47, .12 * Math.PI, .88 * Math.PI);
    ctx.stroke();
  }

  ctx.strokeStyle = '#e8d27c';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(-62 - shoulderRoll * 8, -60 + shoulderRoll * 5);
  ctx.lineTo(-105 + shoulderRoll * 20, -8 + shoulderRoll * 8);
  ctx.moveTo(62 + shoulderRoll * 8, -60 - shoulderRoll * 5);
  ctx.lineTo(105 - shoulderRoll * 20, -8 - shoulderRoll * 8);
  ctx.stroke();

  if (habeshaStyle) {
    ctx.strokeStyle = '#a42f32';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-102, -7);
    ctx.lineTo(-109, 3);
    ctx.moveTo(102, -7);
    ctx.lineTo(109, 3);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(headSlide, 0);
  ctx.fillStyle = '#20170f';
  ctx.beginPath();
  ctx.ellipse(-24, -188, 8, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(24, -188, 8, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-25, -160);
  ctx.quadraticCurveTo(0, -142, 25, -160);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-75, 88); ctx.lineTo(-85 + shoulderRoll * 8, 145);
  ctx.moveTo(75, 88); ctx.lineTo(85 - shoulderRoll * 8, 145);
  ctx.stroke();
  ctx.restore();
}

function borderFrame() {
  ctx.fillStyle = '#dcbf78';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 28;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = '#9f3025';
  ctx.lineWidth = 10;
  ctx.strokeRect(38, 38, W - 76, H - 76);
  ctx.strokeStyle = '#2f6743';
  ctx.lineWidth = 5;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  ctx.fillStyle = '#20170f';
  ctx.fillRect(56, 56, W - 112, 92);
  ctx.fillStyle = '#f4e7bc';
  ctx.fillRect(72, 72, W - 144, 60);
  ctx.strokeStyle = '#9f3025';
  ctx.lineWidth = 5;
  ctx.strokeRect(72, 72, W - 144, 60);
}

function drawMountain(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#6d7c55';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-360, 180);
  ctx.lineTo(-150, -180);
  ctx.lineTo(30, 180);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4d6549';
  ctx.beginPath();
  ctx.moveTo(-40, 180);
  ctx.lineTo(190, -120);
  ctx.lineTo(390, 180);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawSun(x, y, r) {
  ctx.fillStyle = '#d77a2d';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#20170f';
  ctx.beginPath();
  ctx.ellipse(x - r*.28, y - r*.08, r*.07, r*.12, 0, 0, Math.PI*2);
  ctx.ellipse(x + r*.28, y - r*.08, r*.07, r*.12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + r*.12, r*.25, 0.1*Math.PI, .9*Math.PI);
  ctx.stroke();
}

function drawMoon(x, y, r, skyColor) {
  ctx.fillStyle = '#f4e7bc';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = skyColor;
  ctx.beginPath();
  ctx.arc(x + r * .42, y - r * .25, r * .9, 0, Math.PI * 2);
  ctx.fill();
}

function drawHut(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#8e592e';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-140, -20);
  ctx.quadraticCurveTo(0, -220, 140, -20);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c6a45e';
  ctx.fillRect(-120, -20, 240, 155);
  ctx.strokeRect(-120, -20, 240, 155);
  ctx.fillStyle = '#20170f';
  ctx.beginPath();
  ctx.arc(0, 70, 38, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

function drawCake(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#f3e5c4';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 10;
  ctx.fillRect(-170, -110, 340, 110);
  ctx.strokeRect(-170, -110, 340, 110);
  ctx.fillStyle = '#d8b47b';
  ctx.fillRect(-164, -78, 328, 12);
  ctx.fillStyle = '#fff8e9';
  ctx.fillRect(-170, -140, 340, 38);
  ctx.strokeRect(-170, -140, 340, 38);
  ctx.beginPath();
  ctx.moveTo(-170, -102);
  ctx.lineTo(-170, -124);
  ctx.quadraticCurveTo(-150, -116, -132, -126);
  ctx.quadraticCurveTo(-112, -138, -92, -124);
  ctx.quadraticCurveTo(-68, -112, -47, -126);
  ctx.quadraticCurveTo(-25, -140, 0, -124);
  ctx.quadraticCurveTo(22, -112, 45, -126);
  ctx.quadraticCurveTo(70, -140, 92, -124);
  ctx.quadraticCurveTo(114, -112, 136, -126);
  ctx.quadraticCurveTo(153, -134, 170, -122);
  ctx.lineTo(170, -102);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e9c5a5';
  for (let i=-132;i<=132;i+=66) {
    ctx.beginPath();
    ctx.arc(i, -137, 13, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawProsecco(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#77713b';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.lineTo(-35, -142);
  ctx.quadraticCurveTo(-35, -166, -20, -178);
  ctx.lineTo(-16, -220);
  ctx.lineTo(16, -220);
  ctx.lineTo(20, -178);
  ctx.quadraticCurveTo(35, -166, 35, -142);
  ctx.lineTo(35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d7ad52';
  ctx.fillRect(-18, -224, 36, 34);
  ctx.strokeRect(-18, -224, 36, 34);
  ctx.fillStyle = '#fff4d5';
  ctx.fillRect(-29, -120, 58, 64);
  ctx.strokeRect(-29, -120, 58, 64);
  ctx.fillStyle = '#20170f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px Georgia';
  ctx.fillText('prosecco', 0, -88);
  ctx.restore();
}

function drawFruitPlate(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#f3e5c4';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 142, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const fruits = [
    [-88, -38, 27, '#b83d32'],
    [-42, -60, 29, '#d6a33f'],
    [8, -49, 28, '#78934e'],
    [58, -59, 27, '#9f3025'],
    [94, -32, 24, '#76518a'],
    [-20, -30, 25, '#d7ad52'],
    [44, -29, 22, '#71934c']
  ];
  for (const [fruitX, fruitY, radius, color] of fruits) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(fruitX, fruitY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#496b3d';
    ctx.beginPath();
    ctx.ellipse(fruitX + 8, fruitY - radius + 1, 10, 5, -.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrown(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e4b33f';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-42, 0);
  ctx.lineTo(-42, -36);
  ctx.lineTo(-20, -20);
  ctx.lineTo(0, -58);
  ctx.lineTo(20, -20);
  ctx.lineTo(42, -36);
  ctx.lineTo(42, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9f3025';
  for (const jewelX of [-21, 0, 21]) {
    ctx.beginPath();
    ctx.arc(jewelX, -16, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function caption(text, amharic) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#20170f';
  ctx.font = '700 44px Georgia';
  ctx.fillText(text, W/2, 121);
  ctx.font = '700 34px Georgia';
  ctx.fillText(amharic, W/2, 170);
}

function renderTitle(t) {
  borderFrame();
  ctx.fillStyle = '#dcbf78';
  ctx.fillRect(72, 132, W-144, H-188);
  drawMountain(430, 670, .9);
  drawMountain(1350, 690, 1.05);
  drawSun(960, 330, 150);
  flower(960, 610, 2.2, '#b83d32');
  ctx.fillStyle = '#20170f';
  ctx.font = '700 82px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('SELAM MY PRINCESS', W/2, 770);
  ctx.font = 'italic 38px Georgia';
  ctx.fillText('ሰላም · My Princess- ልዕልት', W/2, 825);
  caption('የኔ-ቆንጆ', 'ዉብ አበባ');
}

function renderDawn(t) {
  borderFrame();
  const sky = ctx.createLinearGradient(0, 150, 0, 890);
  sky.addColorStop(0, '#db8e66');
  sky.addColorStop(.58, '#e8c27d');
  sky.addColorStop(1, '#81966b');
  ctx.fillStyle = sky;
  ctx.fillRect(72, 132, W-144, H-188);
  drawMountain(430, 680, .95);
  drawMountain(1480, 670, .95);
  const rise = Math.max(0, Math.min(1, t/10));
  drawSun(1450, 690-rise*340, 125);
  drawHut(960, 820, 1.4);
  drawSleepingSelam(t, true);
  caption('MY BABY GIRL, RISING WITH THE SUN', 'SELAM WAKES TO A NEW DAY');
}

function drawSleepingSelam(t, longHair = false) {
  const wake = Math.max(0, Math.min(1, (t-4)/5));

  ctx.fillStyle = '#583b2b';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 10;
  ctx.fillRect(660, 822, 600, 32);
  ctx.strokeRect(660, 822, 600, 32);
  ctx.fillRect(700, 852, 28, 38);
  ctx.strokeRect(700, 852, 28, 38);
  ctx.fillRect(1192, 852, 28, 38);
  ctx.strokeRect(1192, 852, 28, 38);

  ctx.fillStyle = '#f4e7bc';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  roundedRect(690, 754, 540, 72, 22);
  ctx.fill();
  ctx.stroke();
  roundedRect(760, 712, 150, 66, 24);
  ctx.fillStyle = '#fff4d5';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#c9dcba';
  ctx.beginPath();
  ctx.moveTo(830, 731);
  ctx.quadraticCurveTo(1010, 705, 1206, 739);
  ctx.lineTo(1220, 816);
  ctx.lineTo(832, 816);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#9f3025';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(862, 770);
  ctx.quadraticCurveTo(1030, 800, 1207, 772);
  ctx.stroke();

  if (longHair) {
    ctx.fillStyle = '#18120f';
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 6;
    for (let i=0;i<7;i++) {
      ctx.beginPath();
      ctx.arc(772+i*17, 660-(i%2)*7, 18, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
    for (const x of [772, 872]) {
      for (const y of [682, 712, 742]) {
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = '#563c2b';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(822, 700, 48, 0, Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#251a12';
  ctx.beginPath();
  ctx.arc(822, 696, 49, Math.PI, Math.PI*2);
  ctx.lineTo(871, 690);
  ctx.quadraticCurveTo(850, 682, 822, 690);
  ctx.quadraticCurveTo(795, 682, 773, 691);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(802, 703); ctx.lineTo(814, 703);
  ctx.moveTo(831, 703); ctx.lineTo(843, 703);
  ctx.stroke();
  ctx.fillStyle = '#20170f';
  ctx.beginPath();
  ctx.ellipse(822, 720, 5+5*wake, 3+10*wake, 0, 0, Math.PI*2);
  ctx.fill();

  if (wake > .3) {
    ctx.fillStyle = '#e4b33f';
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(792, 660); ctx.lineTo(796, 638);
    ctx.lineTo(810, 650); ctx.lineTo(822, 628);
    ctx.lineTo(835, 650); ctx.lineTo(850, 638);
    ctx.lineTo(853, 660); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  ctx.strokeStyle = '#563c2b';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(861, 746);
  ctx.quadraticCurveTo(880, 718-wake*34, 900+wake*42, 728-wake*48);
  ctx.stroke();
}

function drawNameLabel(text, x, y) {
  ctx.fillStyle = '#fff4d5';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 5;
  roundedRect(x-100, y-32, 200, 58, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#20170f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 32px Georgia';
  ctx.fillText(text, x, y-3);
}

function renderDance(t) {
  borderFrame();
  ctx.fillStyle = '#87a36e';
  ctx.fillRect(72, 132, W-144, H-188);

  ctx.fillStyle = '#d0a95d';
  for (let x=120;x<W;x+=180) {
    ctx.beginPath();
    ctx.arc(x, 830, 100, Math.PI, 0);
    ctx.fill();
  }

  const bounce = Math.sin(t * 3.8) * 18;
  const dresses = ['#f1ddaa', '#c9dcba', '#fffaf0', '#f2d68a', '#bdd7b6'];
  for (let i=0;i<5;i++) {
    const x = 350 + i * 300;
    const y = 760 + (i % 2 ? bounce : -bounce);
    drawPerson(x, y, 0.72, dresses[i], i === 2 ? '#18120f' : '#251a12', t * 3 + i, i === 2, i === 3 ? '#fffaf0' : '#563c2b', i === 2, i !== 0);
  }

  drawNameLabel('Yemi', 650, 520);
  drawNameLabel('Selam', 950, 520);
  drawNameLabel('Jasmin', 1250, 520);
  drawNameLabel('Beza', 1550, 520);
  drawNameLabel('Teddy', 350, 520);
  for (let i=0;i<8;i++) flower(180+i*220, 890+(i%2)*38, .42, i%2 ? '#b83d32' : '#d7a83f', false);
  caption('የኔ-ቆንጆ', 'ዉብ አበባ');
  ctx.font = 'italic 30px Georgia';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#20170f';
  ctx.fillText('Eskista with her friends', W/2, 215);
}

function drawStickFigure(x, y, scale, side, reaching, isGirl = false, backwardsHat = false, selamStyle = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#20170f';
  ctx.fillStyle = '#d7ad5b';
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';

  if (isGirl) {
    ctx.fillStyle = '#251a12';
    if (selamStyle) ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(-42, -151, 12, 52, -.08, 0, Math.PI * 2);
    ctx.ellipse(42, -151, 12, 52, .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (selamStyle) {
      for (let x=-42;x<=42;x+=21) {
        ctx.beginPath();
        ctx.arc(x, -231-(Math.abs(x)%42 ? 0 : 7), 15, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
      for (const x of [-58,58]) {
        ctx.beginPath();
        ctx.arc(x,-228,11,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = selamStyle ? '#563c2b' : '#d7ad5b';
  if (selamStyle) ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, -190, 43, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (isGirl) {
    ctx.fillStyle = '#251a12';
    ctx.beginPath();
    ctx.arc(0, -208, 44, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (selamStyle) drawCrown(0, -238, .52);
  }

  if (backwardsHat) {
    ctx.fillStyle = '#263950';
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-44, -202);
    ctx.lineTo(-44, -235);
    ctx.quadraticCurveTo(-40, -282, 0, -282);
    ctx.quadraticCurveTo(40, -282, 44, -235);
    ctx.lineTo(44, -202);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-42, -211);
    ctx.lineTo(-80, -178);
    ctx.quadraticCurveTo(-89, -174, -80, -192);
    ctx.lineTo(-49, -217);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    roundedRect(-53, -215, 106, 20, 5);
    ctx.fillStyle = '#f4e7bc';
    ctx.fill();
    ctx.strokeStyle = '#20170f';
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  ctx.fillStyle = '#20170f';
  ctx.beginPath();
  ctx.arc(-13, -180, 5, 0, Math.PI * 2);
  ctx.arc(13, -180, 5, 0, Math.PI * 2);
  ctx.fill();
  if (selamStyle) ctx.lineWidth = 5;
  ctx.beginPath();
  if (selamStyle) {
    ctx.moveTo(-10, -160);
    ctx.quadraticCurveTo(0, -150, 10, -160);
  } else {
    ctx.arc(0, -164, 13, .15 * Math.PI, .85 * Math.PI);
  }
  ctx.stroke();

  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(0, -146);
  ctx.lineTo(0, -32);
  ctx.moveTo(0, -125);
  if (reaching) {
    ctx.lineTo(side * 76, -108);
    ctx.lineTo(side * 155, -105);
  } else {
    ctx.lineTo(-side * 58, -75);
    ctx.lineTo(-side * 48, -30);
  }
  ctx.moveTo(0, -32);
  ctx.lineTo(-52, 48);
  ctx.moveTo(0, -32);
  ctx.lineTo(52, 48);
  ctx.stroke();

  if (isGirl) {
    ctx.fillStyle = selamStyle ? '#fffaf0' : '#e3a79b';
    ctx.beginPath();
    ctx.moveTo(-38, -142);
    ctx.lineTo(38, -142);
    ctx.lineTo(60, -26);
    ctx.lineTo(-60, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (selamStyle) {
      ctx.fillStyle = '#a42f32';
      ctx.strokeStyle = '#d9af55';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-17,-139);
      ctx.lineTo(17,-139);
      ctx.lineTo(25,-29);
      ctx.lineTo(0,-12);
      ctx.lineTo(-25,-29);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e4b33f';
      for (const y of [-117,-91,-65,-39]) {
        ctx.beginPath();
        ctx.arc(0,y,5,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#20170f';
    ctx.beginPath();
    ctx.moveTo(0, -125);
    ctx.lineTo(side * 76, -108);
    ctx.lineTo(side * 155, -105);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBouquet(x, y) {
  ctx.strokeStyle = '#2f6743';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x - 15, y + 105);
  ctx.moveTo(x + 4, y + 15);
  ctx.lineTo(x + 15, y + 105);
  ctx.moveTo(x - 2, y + 55);
  ctx.lineTo(x - 40, y + 38);
  ctx.moveTo(x + 5, y + 65);
  ctx.lineTo(x + 38, y + 45);
  ctx.stroke();

  flower(x - 38, y + 6, .28, '#b83d32', false);
  flower(x, y - 18, .32, '#e1b847', false);
  flower(x + 38, y + 8, .28, '#9f7bba', false);
}

function renderGarden(t) {
  borderFrame();
  ctx.fillStyle = '#87a36e';
  ctx.fillRect(72, 132, W-144, 670);
  ctx.fillStyle = '#dcbf78';
  ctx.fillRect(72, 802, W-144, 90);

  drawMountain(520, 610, .58);
  drawMountain(1460, 620, .62);
  drawSun(960, 310, 95);
  ctx.fillStyle = '#20170f';
  ctx.textAlign = 'center';
  ctx.font = '700 42px Georgia';
  ctx.fillText('Twins', 960, 448);

  for (let i=0;i<9;i++) {
    flower(160+i*200, 820+(i%2)*24, .45, i%2 ? '#b83d32' : '#d7a83f', false);
  }

  const boyJump = Math.abs(Math.sin(t * 4.5)) * 18;
  const girlJump = Math.abs(Math.sin(t * 4.5 + .55)) * 18;
  const boyY = 790 - boyJump;
  const girlY = 790 - girlJump;
  drawStickFigure(680, 790, .9, 1, true, false, true);
  drawStickFigure(1240, 790, .9, -1, true, true, false, true);
  drawStickFigure(330, boyY, .48, 1, true);
  drawStickFigure(1590, girlY, .48, -1, true, true);
  const bouquetY = 610 + Math.sin(t * 3) * 5;
  line(680 + 155 * .9, 790 - 105 * .9, 947, bouquetY + 80, '#20170f', 10);
  line(1240 - 155 * .9, 790 - 105 * .9, 973, bouquetY + 80, '#20170f', 10);
  drawBouquet(960, bouquetY);
  drawNameLabel('Abel', 330, 570 - boyJump);
  drawNameLabel('Leelet', 1590, 570 - girlJump);
  caption('A FLOWER FOR YOU', '');
}

function drawStreetBuilding(x, label, style) {
  const width = 430;
  const base = 760;
  const height = style === 'Emory' ? 330 : style === 'Publix' ? 300 : 350;
  const top = base - height;
  const wall = style === 'Emory' ? '#a66f59' : style === 'Publix' ? '#e5d7b4' : '#d6bd8b';

  ctx.save();
  ctx.translate(x, 0);
  ctx.fillStyle = wall;
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 9;
  ctx.fillRect(0, top, width, height);
  ctx.strokeRect(0, top, width, height);

  if (style === 'Nega Sega Bete') {
    ctx.fillStyle = '#9f3025';
    ctx.beginPath();
    ctx.moveTo(-20, top + 8);
    ctx.lineTo(width / 2, top - 75);
    ctx.lineTo(width + 20, top + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = style === 'Publix' ? '#47784b' : '#e8d8b8';
    ctx.fillRect(-8, top + 8, width + 16, 48);
    ctx.strokeRect(-8, top + 8, width + 16, 48);
  }

  const signY = top + 50;
  ctx.fillStyle = '#fff4d5';
  ctx.fillRect(34, signY, width - 68, 64);
  ctx.strokeRect(34, signY, width - 68, 64);
  ctx.fillStyle = style === 'Publix' ? '#386641' : '#20170f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${style === 'Nega Sega Bete' ? 32 : 34}px Georgia`;
  ctx.fillText(label, width / 2, signY + 32);

  if (style === 'Emory') {
    ctx.fillStyle = '#e8d8b8';
    for (let i = 0; i < 4; i++) {
      const columnX = 52 + i * 104;
      ctx.fillRect(columnX, signY + 82, 24, 136);
      ctx.strokeRect(columnX, signY + 82, 24, 136);
    }
  }

  ctx.fillStyle = style === 'Publix' ? '#83a4a1' : '#82969a';
  for (let i = 0; i < 3; i++) {
    const windowX = 34 + i * 132;
    ctx.fillRect(windowX, base - 108, 104, 96);
    ctx.strokeRect(windowX, base - 108, 104, 96);
  }

  ctx.restore();
}

function drawLexusCar(t) {
  const x = 960;
  const y = 850;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(32,23,15,.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 390, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#263950';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-350, -55);
  ctx.quadraticCurveTo(-335, -130, -260, -145);
  ctx.lineTo(-175, -245);
  ctx.quadraticCurveTo(-145, -280, -90, -280);
  ctx.lineTo(135, -280);
  ctx.quadraticCurveTo(195, -278, 235, -220);
  ctx.lineTo(320, -150);
  ctx.quadraticCurveTo(360, -130, 365, -75);
  ctx.lineTo(350, -40);
  ctx.lineTo(-340, -40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b7d0d2';
  ctx.beginPath();
  ctx.moveTo(-230, -155);
  ctx.lineTo(-155, -237);
  ctx.quadraticCurveTo(-138, -258, -95, -258);
  ctx.lineTo(-12, -258);
  ctx.lineTo(-12, -155);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -258);
  ctx.lineTo(130, -258);
  ctx.quadraticCurveTo(168, -254, 198, -215);
  ctx.lineTo(264, -155);
  ctx.lineTo(8, -155);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2, -255);
  ctx.lineTo(-2, -154);
  ctx.stroke();

  ctx.fillStyle = '#d7ad5b';
  for (const personX of [-95, 105]) {
    ctx.beginPath();
    ctx.arc(personX, -205, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#20170f';
    ctx.beginPath();
    ctx.arc(personX - 9, -210, 3, 0, Math.PI * 2);
    ctx.arc(personX + 9, -210, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(personX, -199, 7, .15 * Math.PI, .85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#d7ad5b';
  }
  drawCrown(105, -232, .28);

  ctx.fillStyle = '#d8dce0';
  ctx.fillRect(-320, -105, 48, 23);
  ctx.fillStyle = '#f0cf69';
  ctx.fillRect(325, -105, 28, 22);
  ctx.fillStyle = '#fff4d5';
  ctx.font = '700 27px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Lexus', 42, -76);
  ctx.fillStyle = '#1b2633';
  ctx.beginPath();
  ctx.moveTo(300, -112);
  ctx.lineTo(352, -105);
  ctx.lineTo(337, -58);
  ctx.lineTo(292, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4d5';
  ctx.beginPath();
  ctx.ellipse(322, -83, 19, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#20170f';
  ctx.font = '700 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', 322, -83);

  for (const wheelX of [-235, 230]) {
    ctx.fillStyle = '#20170f';
    ctx.beginPath();
    ctx.arc(wheelX, -45, 59, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a8a8a2';
    ctx.beginPath();
    ctx.arc(wheelX, -45, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function blendHexColors(start, end, amount) {
  const startValue = Number.parseInt(start.slice(1), 16);
  const endValue = Number.parseInt(end.slice(1), 16);
  const channel = shift => {
    const from = (startValue >> shift) & 255;
    const to = (endValue >> shift) & 255;
    return Math.round(from + (to - from) * amount).toString(16).padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

function drawCloud(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f3f0df';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.moveTo(-92, 24);
  ctx.lineTo(-92, 9);
  ctx.arc(-55, 9, 37, Math.PI, Math.PI * 1.5);
  ctx.arc(-10, -20, 52, Math.PI, Math.PI * 2);
  ctx.arc(48, 0, 42, Math.PI * 1.15, Math.PI * 2);
  ctx.lineTo(92, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function renderRain(t) {
  borderFrame();
  const skyPhases = [
    { top: '#6f6b8a', horizon: '#d98b63' },
    { top: '#5b9ab9', horizon: '#e6cb86' },
    { top: '#714763', horizon: '#e78d58' },
    { top: '#17253f', horizon: '#52556d' }
  ];
  const phase = (t / 3.5) % skyPhases.length;
  const phaseIndex = Math.floor(phase);
  const nextSky = (phaseIndex + 1) % skyPhases.length;
  const transition = (phase - phaseIndex) ** 2 * (3 - 2 * (phase - phaseIndex));
  const skyTop = blendHexColors(skyPhases[phaseIndex].top, skyPhases[nextSky].top, transition);
  const skyHorizon = blendHexColors(skyPhases[phaseIndex].horizon, skyPhases[nextSky].horizon, transition);
  const sky = ctx.createLinearGradient(0, 132, 0, 760);
  sky.addColorStop(0, skyTop);
  sky.addColorStop(1, skyHorizon);
  ctx.fillStyle = sky;
  ctx.fillRect(72, 132, W - 144, H - 188);

  const daylight = Math.max(0, 1 - Math.abs(phase - 1) / 1.15);
  const moonlight = Math.max(0, 1 - Math.abs(phase - 3) / 1.1);
  if (daylight > 0) {
    ctx.save();
    ctx.globalAlpha = daylight;
    drawSun(350 + Math.sin(t * .45) * 55, 295, 76);
    ctx.restore();
  }
  if (moonlight > 0) {
    ctx.save();
    ctx.globalAlpha = moonlight;
    drawMoon(1550, 285, 76, skyTop);
    for (let i = 0; i < 18; i++) {
      const x = 180 + (i * 263) % 1540;
      const y = 190 + (i * 79) % 280;
      ctx.fillStyle = '#fff4d5';
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const cloudOffset = t * 115;
  for (const [baseX, y, scale] of [[350, 290, .72], [980, 365, .85], [1650, 265, .68], [2050, 400, .75]]) {
    const x = ((baseX - cloudOffset) % 2050 + 2050) % 2050 - 70;
    drawCloud(x, y, scale);
  }

  const roadOffset = (t * 70) % 1800;
  const buildings = [
    { x: 100, label: 'ነጋ ስጋ ቤት', style: 'Nega Sega Bete' },
    { x: 700, label: 'Emory', style: 'Emory' },
    { x: 1300, label: 'Publix', style: 'Publix' }
  ];
  for (const building of buildings) {
    const x = ((building.x - roadOffset) % 1800 + 1800) % 1800;
    drawStreetBuilding(x, building.label, building.style);
  }

  ctx.fillStyle = '#78934e';
  ctx.fillRect(72, 760, W - 144, 34);
  ctx.fillStyle = '#54565b';
  ctx.fillRect(72, 794, W - 144, 98);
  ctx.fillStyle = '#f3e5c4';
  for (let i = 0; i < 5; i++) {
    const dashX = ((i * 440 - t * 170) % 2100 + 2100) % 2100 - 150;
    ctx.fillRect(dashX, 842, 180, 9);
  }

  drawLexusCar(t);
  caption('EVERY DAY IS NEW WITH YOU; IT NEVER GETS OLD', '');
}

function renderBirthday(t) {
  borderFrame();
  ctx.fillStyle = '#34415a';
  ctx.fillRect(72,132,W-144,H-188);

  drawMoon(1510, 300, 125, '#34415a');
  ctx.fillStyle = '#dcbf78';
  ctx.fillRect(72,830,W-144,62);
  flower(190, 790, .62, '#b83d32', false);
  flower(510, 815, .55, '#e1b847', false);
  flower(1400, 815, .55, '#9f7bba', false);
  flower(1740, 790, .62, '#cfb54d', false);

  drawPerson(420, 820, .72, '#f1ddaa', '#3a291e', t*2);
  drawPerson(620, 820, .72, '#fffaf0', '#18120f', -t*2, true, '#563c2b', true, true);
  drawCake(960, 790, 1.05);
  drawProsecco(1200, 810, .82);
  drawFruitPlate(1580, 820, .62);

  ctx.fillStyle = '#20170f';
  for (let i=0;i<6;i++) {
    const x=815+i*58;
    ctx.fillRect(x,585,8,65);
    if (Math.sin(t*9+i)>-.25) {
      ctx.fillStyle='#f5b62d';
      ctx.beginPath();
      ctx.moveTo(x+4,585);
      ctx.quadraticCurveTo(x+35,555,x+4,520);
      ctx.quadraticCurveTo(x-22,555,x+4,585);
      ctx.fill();
      ctx.fillStyle='#20170f';
    }
  }

  caption('Happy Princess Day 2026', 'መልካም የልዕልት ቀን');
}

function renderEnd(t) {
  borderFrame();
  ctx.fillStyle = '#34415a';
  ctx.fillRect(72,132,W-144,H-188);
  drawMoon(1510, 290, 115, '#34415a');
  for (let i=0;i<24;i++) {
    const x = 150 + (i*317)%1620;
    const y = 205 + (i*139)%390;
    ctx.fillStyle = '#f4e7bc';
    ctx.beginPath();
    ctx.arc(x, y, i%3===0 ? 7 : 4, 0, Math.PI*2);
    ctx.fill();
  }
  drawHut(960, 820, 1.4);
  flower(200, 815, .62, '#b83d32', false);
  flower(430, 830, .5, '#e1b847', false);
  flower(1500, 830, .5, '#9f7bba', false);
  flower(1740, 815, .62, '#cfb54d', false);

  ctx.fillStyle = '#8e592e';
  ctx.strokeStyle = '#20170f';
  ctx.lineWidth = 8;
  ctx.fillRect(1260, 782, 140, 24);
  ctx.strokeRect(1260, 782, 140, 24);
  ctx.fillRect(1272, 806, 20, 52);
  ctx.strokeRect(1272, 806, 20, 52);
  ctx.fillRect(1368, 806, 20, 52);
  ctx.strokeRect(1368, 806, 20, 52);

  const bedProgress = Math.max(0, Math.min(1, (t-1.1)/1.3));
  ctx.globalAlpha = bedProgress;
  drawSleepingSelam(0, true);
  ctx.globalAlpha = 1-bedProgress;
  drawPerson(1330, 820, .58, '#fffaf0', '#251a12', 0, false, '#563c2b', true);
  ctx.globalAlpha = 1;

  const crownProgress = Math.max(0, Math.min(1, t/1.8));
  const easedCrownProgress = crownProgress*crownProgress*(3-2*crownProgress);
  drawCrown(1330, 674 + 108*easedCrownProgress, .58);
  caption('GOOD NIGHT, PRINCESS SELAM', 'ደህና እደሪልኝ');
}

function render() {
  if (currentTime < 10) {
    renderTitle(currentTime);
  } else if (currentTime < 22) {
    renderDawn(currentTime - 10);
  } else if (currentTime < 38) {
    renderDance(currentTime - 22);
  } else if (currentTime < 52) {
    renderGarden(currentTime - 38);
  } else if (currentTime < 66) {
    renderRain(currentTime - 52);
  } else if (currentTime < 76) {
    renderBirthday(currentTime - 66);
  } else {
    renderEnd(currentTime - 76);
  }

  timeline.value = currentTime;
  const seconds = Math.floor(currentTime);
  const total = soundtrack.src && !soundtrack.paused && Number.isFinite(soundtrack.duration)
    ? Math.max(DURATION, soundtrack.duration)
    : DURATION;
  const totalSeconds = Math.floor(total);
  timeLabel.textContent = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} / ${Math.floor(totalSeconds/60)}:${String(totalSeconds%60).padStart(2,'0')}`;
}

function seekSoundtrack() {
  if (!soundtrack.src || !Number.isFinite(soundtrack.duration) || soundtrack.duration <= 0) return;
  soundtrack.currentTime = Math.min(currentTime, soundtrack.duration);
}

function playSoundtrack() {
  if (!soundtrack.src) return;
  if (!musicIntroLooping) seekSoundtrack();
  const playback = soundtrack.play();
  if (playback && playback.catch) {
    playback.catch(() => {
      musicStatus.textContent = 'Could not play this audio file. Try another audio format.';
    });
  }
}

function play() {
  if (currentTime >= DURATION) {
    currentTime = 0;
    musicIntroLooping = false;
    render();
  }
  playing = true;
  startButton.classList.add('hidden');
  playPause.textContent = '❚❚';
  playPause.setAttribute('aria-label', 'Pause');
  playSoundtrack();
  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

function pause() {
  playing = false;
  playPause.textContent = '▶';
  playPause.setAttribute('aria-label', 'Play');
  soundtrack.pause();
}

function loop(now) {
  if (!playing) return;
  if (soundtrack.src && !soundtrack.paused && !musicIntroLooping) {
    currentTime = soundtrack.currentTime;
  } else {
    const delta = (now - lastFrame) / 1000;
    currentTime += delta;
  }
  lastFrame = now;
  if (currentTime >= DURATION) {
    currentTime = DURATION;
    render();
    pause();
    return;
  }
  render();
  requestAnimationFrame(loop);
}

startButton.addEventListener('click', play);
playPause.addEventListener('click', () => playing ? pause() : play());
timeline.addEventListener('input', () => {
  currentTime = Number(timeline.value);
  if (!musicIntroLooping) seekSoundtrack();
  render();
});
musicFile.addEventListener('change', () => {
  const file = musicFile.files && musicFile.files[0];
  if (!file) return;
  const selectionId = ++musicSelectionId;
  useMusicFile(file);
  musicStatus.textContent = `Saving ${file.name} in this browser...`;
  saveMusicFile(file).then(() => {
    if (selectionId === musicSelectionId) {
      musicStatus.textContent = `Saved ${file.name}. Press Play to start the film and music.`;
    }
  }).catch(error => {
    console.error('Could not save the selected soundtrack.', error);
    if (selectionId === musicSelectionId) {
      musicStatus.textContent = `Selected ${file.name}; it will play now, but could not be saved for next time.`;
    }
  });
});
soundtrack.addEventListener('loadedmetadata', () => {
  timeline.max = Math.max(DURATION, soundtrack.duration);
  if (!musicIntroLooping) seekSoundtrack();
  render();
});
soundtrack.addEventListener('error', () => {
  musicStatus.textContent = 'This audio file could not be loaded. Try another audio format.';
});
soundtrack.addEventListener('ended', () => {
  currentTime = Math.min(currentTime, DURATION);
  timeline.max = DURATION;
  render();
  if (soundtrack.duration < MUSIC_LOOP_END) {
    musicStatus.textContent = 'Song ended; it is shorter than 0:25, so the 0:20–0:25 section cannot be repeated.';
    return;
  }
  musicIntroLooping = true;
  if (playing && currentTime < DURATION) {
    soundtrack.currentTime = MUSIC_LOOP_START;
    musicStatus.textContent = 'Song ended; repeating 0:20–0:25 until the film ends.';
    playSoundtrack();
  }
});
soundtrack.addEventListener('timeupdate', () => {
  if (!musicIntroLooping || !playing || !Number.isFinite(soundtrack.duration)) return;
  if (soundtrack.currentTime >= MUSIC_LOOP_END) {
    soundtrack.currentTime = MUSIC_LOOP_START;
  }
});
muteButton.addEventListener('click', () => {
  musicMuted = !musicMuted;
  soundtrack.muted = musicMuted;
  muteButton.textContent = musicMuted ? '×' : '♪';
  muteButton.setAttribute('aria-label', musicMuted ? 'Unmute music' : 'Mute music');
});
fullscreenButton.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.querySelector('.player').requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

restoreSavedMusic();

render();
