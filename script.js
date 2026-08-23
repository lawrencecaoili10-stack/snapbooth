// Frame Drawing Functions
function drawClassicFrame(ctx, width, height) {
  var borderSize = Math.min(width, height) * 0.05;
  ctx.lineWidth = borderSize;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(borderSize / 2, borderSize / 2, width - borderSize, height - borderSize);
}

function drawNeonFrame(ctx, width, height) {
  var borderSize = Math.min(width, height) * 0.04;
  ctx.lineWidth = borderSize;
  ctx.strokeStyle = '#ff2fd0';
  ctx.shadowColor = '#ff2fd0';
  ctx.shadowBlur = 15;
  ctx.strokeRect(borderSize / 2, borderSize / 2, width - borderSize, height - borderSize);
  ctx.shadowBlur = 0; // reset
}

function drawFloralFrame(ctx, width, height) {
  var borderSize = Math.min(width, height) * 0.04;
  ctx.lineWidth = borderSize;
  ctx.strokeStyle = '#ffd6e8';
  ctx.strokeRect(borderSize / 2, borderSize / 2, width - borderSize, height - borderSize);
}

function drawBirthdayFrame(ctx, width, height) {
  var borderSize = Math.min(width, height) * 0.04;
  ctx.lineWidth = borderSize;
  ctx.strokeStyle = '#ffc857';
  ctx.strokeRect(borderSize / 2, borderSize / 2, width - borderSize, height - borderSize);
}

function drawHolidayFrame(ctx, width, height) {
  var borderSize = Math.min(width, height) * 0.04;
  ctx.lineWidth = borderSize;
  ctx.strokeStyle = '#0f5132';
  ctx.strokeRect(borderSize / 2, borderSize / 2, width - borderSize, height - borderSize);
}

function drawFilmstripFrame(ctx, width, height) {
  var borderSize = Math.min(width, height) * 0.06;
  ctx.lineWidth = borderSize;
  ctx.strokeStyle = '#1a1a1a';
  ctx.strokeRect(borderSize / 2, borderSize / 2, width - borderSize, height - borderSize);
}

var THEMES = [
  { id: 'classic', name: 'Classic Polaroid', swatch: '#ffffff', draw: drawClassicFrame },
  { id: 'neon', name: 'Neon Party', swatch: '#ff2fd0', draw: drawNeonFrame },
  { id: 'floral', name: 'Garden Floral', swatch: '#ffd6e8', draw: drawFloralFrame },
  { id: 'birthday', name: 'Birthday Bash', swatch: '#ffc857', draw: drawBirthdayFrame },
  { id: 'holiday', name: 'Holiday Lights', swatch: '#0f5132', draw: drawHolidayFrame },
  { id: 'filmstrip', name: 'Film Strip', swatch: '#1a1a1a', draw: drawFilmstripFrame }
];

var currentTheme = THEMES[0];

(function () {
  'use strict';

  var APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxrY8PAtR23fd_Sj--KUpcGmRbzUxLfwZUB1S0cMGN6ixhwOf-b8ng_qCBaZU6f8_E8hg/exec';

  var video = document.getElementById('video');
  var overlayCanvas = document.getElementById('overlayCanvas');
  var overlayCtx = overlayCanvas.getContext('2d');
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
    statusMsg.textContent = 'Requesting camera access...';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusMsg.textContent = 'Camera access is not supported by this browser.';
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
        statusMsg.textContent = '';
        return getAvailableCameras();
      })
      .then(function (cameras) {
        var index = cameras.findIndex(function (camera) {
          return camera.deviceId === currentDeviceId;
        });

        if (index !== -1) currentCameraIndex = index;

        if (cameras.length > 1) {
          switchCamBtn.disabled = false;
          switchCamBtn.style.display = '';
        } else {
          switchCamBtn.disabled = true;
          switchCamBtn.style.display = 'none';
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
        statusMsg.textContent = 'Camera error: ' + message;
      });
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(function (track) {
        track.stop();
      });
      currentStream = null;
    }
    video.srcObject = null;
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

  switchCamBtn.addEventListener('click', function () {
    if (!availableCameras || availableCameras.length < 2) {
      statusMsg.textContent = 'Only one camera is connected.';
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

  function resizeOverlayCanvas() {
    var rect = video.parentElement.getBoundingClientRect();
    overlayCanvas.width = rect.width;
    overlayCanvas.height = rect.height;
    renderOverlayPreview();
  }

  function renderOverlayPreview() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    currentTheme.draw(overlayCtx, overlayCanvas.width, overlayCanvas.height);
  }

  window.addEventListener('resize', resizeOverlayCanvas);

  captureBtn.addEventListener('click', function () {
    if (!currentStream) {
      statusMsg.textContent = 'Camera is not ready yet.';
      return;
    }
    captureBtn.disabled = true;
    runCountdown(3, function () {
      takePhoto();
      captureBtn.disabled = false;
    });
  });

  function runCountdown(n, onDone) {
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
    var vw = video.videoWidth || 1280;
    var vh = video.videoHeight || 960;

    captureCanvas.width = vw;
    captureCanvas.height = vh;
    var ctx = captureCanvas.getContext('2d');

    ctx.drawImage(video, 0, 0, vw, vh);
    currentTheme.draw(ctx, vw, vh);

    flashEl.classList.remove('on');
    void flashEl.offsetWidth;
    flashEl.classList.add('on');

    var dataUrl = captureCanvas.toDataURL('image/png');
    lastDownloadUrl = dataUrl;
    downloadBtn.classList.remove('hidden');

    savePhotoToDrive(dataUrl);
  }

  downloadBtn.addEventListener('click', function () {
    if (!lastDownloadUrl) return;
    var a = document.createElement('a');
    a.href = lastDownloadUrl;
    a.download = 'snapbooth_' + currentTheme.id + '_' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  function savePhotoToDrive(dataUrl) {
    statusMsg.textContent = 'Saving photo to Google Drive...';

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
      statusMsg.textContent = 'Photo saved successfully!';
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 2500);
  }

  buildThemeRail();
  startCamera();

  video.addEventListener('loadedmetadata', resizeOverlayCanvas);
  window.addEventListener('load', resizeOverlayCanvas);
})();
