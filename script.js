// ============================================================
// 1. HELPER DRAWING FUNCTIONS
// ============================================================

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTape(ctx, x, y, width, height, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  var rot = Math.PI / 2 * 3;
  var x = cx;
  var y = cy;
  var step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (var i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawFlower(ctx, x, y, size) {
  ctx.save();
  ctx.fillStyle = '#ffb7c5';
  for (var i = 0; i < 5; i++) {
    var angle = (i * 72) * Math.PI / 180;
    var px = x + Math.cos(angle) * (size * 0.6);
    var py = y + Math.sin(angle) * (size * 0.6);
    ctx.beginPath();
    ctx.arc(px, py, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffdb58';
  ctx.fill();
  ctx.restore();
}

function drawBalloon(ctx, x, y, size, color) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.6, size * 0.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.8);
  ctx.lineTo(x, y + size * 1.8);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawSnowflake(ctx, x, y, size) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (var i = 0; i < 6; i++) {
    var angle = (i * 60) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================
// 2. THEME DRAWING FUNCTIONS
// ============================================================

function drawClassicFrame(ctx, w, h) {
  var pad = Math.min(w, h) * 0.05;
  ctx.lineWidth = pad;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  drawTape(ctx, w * 0.2, pad, 60, 20, -10);
  drawTape(ctx, w * 0.8, pad, 60, 20, 10);
}

function drawNeonFrame(ctx, w, h) {
  var pad = Math.min(w, h) * 0.04;
  ctx.lineWidth = pad;
  ctx.strokeStyle = '#ff2fd0';
  ctx.shadowColor = '#ff2fd0';
  ctx.shadowBlur = 15;
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  ctx.shadowBlur = 0;
}

function drawFloralFrame(ctx, w, h) {
  var pad = Math.min(w, h) * 0.04;
  ctx.lineWidth = pad;
  ctx.strokeStyle = '#ffd6e8';
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  drawFlower(ctx, pad * 2, pad * 2, 20);
  drawFlower(ctx, w - pad * 2, pad * 2, 20);
  drawFlower(ctx, pad * 2, h - pad * 2, 20);
  drawFlower(ctx, w - pad * 2, h - pad * 2, 20);
}

function drawBirthdayFrame(ctx, w, h) {
  var pad = Math.min(w, h) * 0.04;
  ctx.lineWidth = pad;
  ctx.strokeStyle = '#ffc857';
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  drawBalloon(ctx, pad * 2, pad * 3, 25, '#ff6b57');
  drawBalloon(ctx, w - pad * 2, pad * 3, 25, '#06a77d');
  drawStar(ctx, w / 2, pad * 2, 5, 15, 7, '#ff6b57');
}

function drawHolidayFrame(ctx, w, h) {
  var pad = Math.min(w, h) * 0.04;
  ctx.lineWidth = pad;
  ctx.strokeStyle = '#0f5132';
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  drawSnowflake(ctx, pad * 2, pad * 2, 15);
  drawSnowflake(ctx, w - pad * 2, pad * 2, 15);
  drawSnowflake(ctx, pad * 2, h - pad * 2, 15);
  drawSnowflake(ctx, w - pad * 2, h - pad * 2, 15);
}

function drawFilmstripFrame(ctx, w, h) {
  var pad = Math.min(w, h) * 0.06;
  ctx.lineWidth = pad;
  ctx.strokeStyle = '#1a1a1a';
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  ctx.fillStyle = '#ffffff';
  for (var y = pad; y < h - pad; y += 30) {
    ctx.fillRect(5, y, 10, 15);
    ctx.fillRect(w - 15, y, 10, 15);
  }
}

// ============================================================
// 3. THEME CONFIGURATION
// ============================================================

var THEMES = [
  { id: 'classic', name: 'Classic Polaroid', swatch: '#ffffff', draw: drawClassicFrame },
  { id: 'neon', name: 'Neon Party', swatch: '#ff2fd0', draw: drawNeonFrame },
  { id: 'floral', name: 'Garden Floral', swatch: '#ffd6e8', draw: drawFloralFrame },
  { id: 'birthday', name: 'Birthday Bash', swatch: '#ffc857', draw: drawBirthdayFrame },
  { id: 'holiday', name: 'Holiday Lights', swatch: '#0f5132', draw: drawHolidayFrame },
  { id: 'filmstrip', name: 'Film Strip', swatch: '#1a1a1a', draw: drawFilmstripFrame }
];

var currentTheme = THEMES[0];

// ============================================================
// 4. MAIN APP CONTROLLER
// ============================================================

(function () {
  'use strict';

  var APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxrY8PAtR23fd_Sj--KUpcGmRbzUxLfwZUB1S0cMGN6ixhwOf-b8ng_qCBaZU6f8_E8hg/exec';

  var video = document.getElementById('video');
  var overlayCanvas = document.getElementById('overlayCanvas');
  var overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;
  var captureCanvas = document.getElementById('captureCanvas');
  var countdownEl = document.getElementById('countdown');
  var flashEl = document.getElementById('flash');
  var statusMsg = document.getElementById('statusMsg');
  var captureBtn = document.getElementById('captureBtn');
  var downloadBtn = document.getElementById('downloadBtn');
  var switchCamBtn = document.getElementById('switchCamBtn');
  var themeListEl = document.getElementById('themeList');

  var currentStream = null;
  var currentDeviceId = null;
  var availableCameras = [];
  var currentCameraIndex = 0;
  var lastDownloadUrl = null;

  function buildThemeRail() {
    if (!themeListEl) return;
    themeListEl.innerHTML = '';

    THEMES.forEach(function (theme) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'theme-card' + (theme.id === currentTheme.id ? ' active' : '');

      var swatch = document.createElement('span');
      swatch.className = 'theme-card__swatch';
      swatch.style.backgroundColor = theme.swatch;

      var label = document.createElement('span');
      label.textContent = theme.name;

      card.appendChild(swatch);
      card.appendChild(label);

      card.addEventListener('click', function () {
        currentTheme = theme;
        buildThemeRail();
        renderOverlayPreview();
      });

      themeListEl.appendChild(card);
    });
  }

  function startCamera(deviceId) {
    stopCamera();
    if (statusMsg) statusMsg.textContent = 'Requesting camera access...';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusMsg) statusMsg.textContent = 'Camera access is not supported by this browser.';
      return;
    }

    var constraints = deviceId
      ? { video: { deviceId: { exact: deviceId } }, audio: false }
      : { video: true, audio: false };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        currentStream = stream;
        video.srcObject = stream;
        return video.play();
      })
      .then(function () {
        var tracks = currentStream.getVideoTracks();
        if (tracks.length > 0) {
          var settings = tracks[0].getSettings();
          currentDeviceId = settings.deviceId || null;
        }
        if (statusMsg) statusMsg.textContent = '';
        return getAvailableCameras();
      })
      .then(function (cameras) {
        var index = cameras.findIndex(function (camera) {
          return camera.deviceId === currentDeviceId;
        });

        if (index !== -1) currentCameraIndex = index;

        if (switchCamBtn) {
          if (cameras.length > 1) {
            switchCamBtn.disabled = false;
            switchCamBtn.style.display = '';
          } else {
            switchCamBtn.disabled = true;
            switchCamBtn.style.display = 'none';
          }
        }
      })
      .catch(function (err) {
        var message;
        switch (err.name) {
          case 'NotAllowedError':
            message = 'Camera permission was denied. Please allow camera access in browser settings.';
            break;
          case 'NotFoundError':
            message = 'No camera was found.';
            break;
          case 'NotReadableError':
            message = 'Camera is already in use by another application.';
            break;
          default:
            message = err.message || 'Unable to access camera.';
        }
        if (statusMsg) statusMsg.textContent = 'Camera error: ' + message;
      });
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(function (track) {
        track.stop();
      });
      currentStream = null;
    }
    if (video) video.srcObject = null;
  }

  function getAvailableCameras() {
    return navigator.mediaDevices
      .enumerateDevices()
      .then(function (devices) {
        availableCameras = devices.filter(function (device) {
          return device.kind === 'videoinput';
        });
        return availableCameras;
      })
      .catch(function () {
        availableCameras = [];
        return [];
      });
  }

  if (switchCamBtn) {
    switchCamBtn.addEventListener('click', function () {
      if (!availableCameras || availableCameras.length < 2) {
        if (statusMsg) statusMsg.textContent = 'Only one camera is connected.';
        return;
      }
      var currentIndex = availableCameras.findIndex(function (camera) {
        return camera.deviceId === currentDeviceId;
      });
      if (currentIndex === -1) currentIndex = currentCameraIndex;

      var nextIndex = (currentIndex + 1) % availableCameras.length;
      var nextCamera = availableCameras[nextIndex];

      if (nextCamera && nextCamera.deviceId) {
        currentCameraIndex = nextIndex;
        startCamera(nextCamera.deviceId);
      }
    });
  }

  function resizeOverlayCanvas() {
    if (!video || !overlayCanvas) return;
    var rect = video.parentElement.getBoundingClientRect();
    overlayCanvas.width = rect.width;
    overlayCanvas.height = rect.height;
    renderOverlayPreview();
  }

  function renderOverlayPreview() {
    if (!overlayCtx || !overlayCanvas) return;
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (currentTheme && typeof currentTheme.draw === 'function') {
      currentTheme.draw(overlayCtx, overlayCanvas.width, overlayCanvas.height);
    }
  }

  if (captureBtn) {
    captureBtn.addEventListener('click', function () {
      if (!currentStream) {
        if (statusMsg) statusMsg.textContent = 'Camera is not ready yet.';
        return;
      }
      captureBtn.disabled = true;
      runCountdown(3, function () {
        takePhoto();
        captureBtn.disabled = false;
      });
    });
  }

  function runCountdown(n, onDone) {
    if (!countdownEl) return onDone();
    countdownEl.classList.remove('hidden');
    countdownEl.textContent = n;

    var timer = setInterval(function () {
      n -= 1;
      if (n <= 0) {
        clearInterval(timer);
        countdownEl.classList.add('hidden');
        onDone();
      } else {
        countdownEl.textContent = n;
      }
    }, 800);
  }

  function takePhoto() {
    if (!video || !captureCanvas) return;
    var vw = video.videoWidth || 1280;
    var vh = video.videoHeight || 960;

    captureCanvas.width = vw;
    captureCanvas.height = vh;
    var ctx = captureCanvas.getContext('2d');

    ctx.drawImage(video, 0, 0, vw, vh);
    if (currentTheme && typeof currentTheme.draw === 'function') {
      currentTheme.draw(ctx, vw, vh);
    }

    if (flashEl) {
      flashEl.classList.remove('on');
      void flashEl.offsetWidth;
      flashEl.classList.add('on');
    }

    var dataUrl = captureCanvas.toDataURL('image/png');
    lastDownloadUrl = dataUrl;
    if (downloadBtn) downloadBtn.classList.remove('hidden');

    savePhotoToDrive(dataUrl);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (!lastDownloadUrl) return;
      var a = document.createElement('a');
      a.href = lastDownloadUrl;
      a.download = 'snapbooth_' + currentTheme.id + '_' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  function savePhotoToDrive(dataUrl) {
    if (statusMsg) statusMsg.textContent = 'Saving photo to Google Drive...';

    var iframe = document.createElement('iframe');
    iframe.name = 'driveUploadFrame_' + Date.now();
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = iframe.name;
    form.style.display = 'none';

    var photoInput = document.createElement('input');
    photoInput.type = 'hidden';
    photoInput.name = 'photo';
    photoInput.value = dataUrl;
    form.appendChild(photoInput);

    var themeInput = document.createElement('input');
    themeInput.type = 'hidden';
    themeInput.name = 'theme';
    themeInput.value = currentTheme.id;
    form.appendChild(themeInput);

    var filenameInput = document.createElement('input');
    filenameInput.type = 'hidden';
    filenameInput.name = 'filename';
    filenameInput.value = 'snapbooth_' + currentTheme.id + '_' + Date.now() + '.png';
    form.appendChild(filenameInput);

    document.body.appendChild(form);
    form.submit();

    setTimeout(function () {
      if (statusMsg) statusMsg.textContent = 'Photo saved successfully!';
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 2500);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildThemeRail();
    startCamera();

    if (video) {
      video.addEventListener('loadedmetadata', resizeOverlayCanvas);
    }
    window.addEventListener('resize', resizeOverlayCanvas);
  });
})();
