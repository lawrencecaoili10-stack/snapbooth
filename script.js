(function () {
  'use strict';

  // ============================================================
  // BACKEND ENDPOINT
  // ============================================================
  // Paste the /exec URL of your deployed Apps Script Web App here.
  // Deploy > Manage deployments > Web app > copy the URL ending in /exec

  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxrY8PAtR23fd_Sj--KUpcGmRbzUxLfwZUB1S0cMGN6ixhwOf-b8ng_qCBaZU6f8_E8hg/exec';

  // ============================================================
  // DOM REFERENCES
  // ============================================================

  var video = document.getElementById('video');
  var overlayCanvas = document.getElementById('overlayCanvas');
  var overlayCtx = overlayCanvas.getContext('2d');
  var captureCanvas = document.getElementById('captureCanvas');
  var countdownEl = document.getElementById('countdown');
  var flashEl = document.getElementById('flash');
  var statusMsg = document.getElementById('statusMsg');
  var captureBtn = document.getElementById('captureBtn');
  var downloadBtn = document.getElementById('downloadBtn');
  var themeListEl = document.getElementById('themeList');
  var layoutListEl = document.getElementById('layoutList');
  var sessionGalleryStrip = document.getElementById('sessionGalleryStrip');


  // ============================================================
  // CAMERA STATE
  // ============================================================

  var currentStream = null;
  var facingMode = 'user';

  // Stores the latest captured image as a data URL.
  var lastDownloadUrl = null;


  // ============================================================
  // THEMES
  // ============================================================

  var THEMES = [
    {
      id: 'classic',
      name: 'Classic Polaroid',
      swatch: '#ffffff',
      // warm, slightly faded instant-film look
      filter: 'sepia(12%) saturate(115%) contrast(104%) brightness(102%)',
      grade: { sepia: 0.12, saturate: 1.15, contrast: 1.04, brightness: 1.02, grayscale: 0 },
      draw: drawClassicFrame
    },
    {
      id: 'neon',
      name: 'Neon Party',
      swatch: '#ff2fd0',
      // punchy, oversaturated club-light look
      filter: 'saturate(165%) contrast(115%) brightness(103%) hue-rotate(-4deg)',
      grade: { sepia: 0, saturate: 1.65, contrast: 1.15, brightness: 1.03, grayscale: 0 },
      draw: drawNeonFrame
    },
    {
      id: 'floral',
      name: 'Garden Floral',
      swatch: '#ffd6e8',
      // soft pastel, lifted shadows, gentle warmth
      filter: 'sepia(8%) saturate(112%) brightness(108%) contrast(96%)',
      grade: { sepia: 0.08, saturate: 1.12, contrast: 0.96, brightness: 1.08, grayscale: 0 },
      draw: drawFloralFrame
    },
    {
      id: 'birthday',
      name: 'Birthday Bash',
      swatch: '#ffc857',
      // bright, vivid, high-energy party colors
      filter: 'saturate(148%) contrast(110%) brightness(106%)',
      grade: { sepia: 0, saturate: 1.48, contrast: 1.10, brightness: 1.06, grayscale: 0 },
      draw: drawBirthdayFrame
    },
    {
      id: 'holiday',
      name: 'Holiday Lights',
      swatch: '#0f5132',
      // cozy warm glow, slightly muted highlights
      filter: 'sepia(18%) saturate(120%) brightness(101%) contrast(103%)',
      grade: { sepia: 0.18, saturate: 1.20, contrast: 1.03, brightness: 1.01, grayscale: 0 },
      draw: drawHolidayFrame
    },
    {
      id: 'filmstrip',
      name: 'Film Strip',
      swatch: '#1a1a1a',
      // classic high-contrast black & white
      filter: 'grayscale(100%) contrast(120%) brightness(103%)',
      grade: { sepia: 0, saturate: 1, contrast: 1.20, brightness: 1.03, grayscale: 1 },
      draw: drawFilmstripFrame
    }
  ];

  var currentTheme = THEMES[0];


  // ============================================================
  // THEME RAIL
  // ============================================================

  function buildThemeRail() {

    themeListEl.innerHTML = '';

    THEMES.forEach(function (theme) {

      var card =
        document.createElement('button');

      card.className =
        'theme-card' +
        (theme.id === currentTheme.id
          ? ' active'
          : '');

      card.setAttribute(
        'data-theme',
        theme.id
      );

      card.innerHTML =
        '<span class="theme-card__swatch" style="background:' +
        theme.swatch +
        '"></span>' +
        '<span>' +
        theme.name +
        '</span>';

      card.addEventListener(
        'click',
        function () {

          currentTheme = theme;

          Array.prototype.forEach.call(
            themeListEl.children,
            function (c) {
              c.classList.remove('active');
            }
          );

          card.classList.add('active');

          applyLiveFilter(theme);

          renderOverlayPreview();
        }
      );

      themeListEl.appendChild(card);

    });

  }


  // ============================================================
  // LAYOUTS
  // ============================================================
  // Each layout defines how many shots to take in a row and how
  // to compose those shots into one final image.

  var LAYOUTS = [
    {
      id: 'classic',
      name: 'Classic',
      shots: 1,
      compose: composeClassic
    },
    {
      id: 'photostrip',
      name: 'Photostrip',
      shots: 3,
      compose: composePhotostrip
    },
    {
      id: 'grid',
      name: 'Grid',
      shots: 4,
      compose: composeGrid
    }
  ];

  var currentLayout = LAYOUTS[0];


  // ============================================================
  // LAYOUT RAIL
  // ============================================================

  function buildLayoutRail() {

    layoutListEl.innerHTML = '';

    LAYOUTS.forEach(function (layout) {

      var card =
        document.createElement('button');

      card.className =
        'layout-card' +
        (layout.id === currentLayout.id
          ? ' active'
          : '');

      card.setAttribute(
        'data-layout',
        layout.id
      );

      card.innerHTML =
        '<span>' +
        layout.name +
        '</span>' +
        '<span class="layout-card__badge">' +
        layout.shots +
        (layout.shots === 1 ? ' shot' : ' shots') +
        '</span>';

      card.addEventListener(
        'click',
        function () {

          currentLayout = layout;

          Array.prototype.forEach.call(
            layoutListEl.children,
            function (c) {
              c.classList.remove('active');
            }
          );

          card.classList.add('active');

        }
      );

      layoutListEl.appendChild(card);

    });

  }


  // ============================================================
  // LIVE PREVIEW FILTER
  // ============================================================
  // Applies the theme's color-grade filter to the <video> element
  // so what you see in the preview matches what gets captured.

  function applyLiveFilter(theme) {

    video.style.filter =
      (theme && theme.filter) ||
      'none';

  }


  // ============================================================
  // CAMERA
  // ============================================================

  function stopCamera() {

    if (currentStream) {

      currentStream
        .getTracks()
        .forEach(function (track) {
          track.stop();
        });

      currentStream = null;
    }

    video.srcObject = null;
  }


  function startCamera() {

    stopCamera();

    statusMsg.textContent =
      'Requesting camera access...';


    var constraints = {

      video: {
        facingMode: {
          ideal: facingMode
        }
      },

      audio: false

    };


    navigator.mediaDevices
      .getUserMedia(constraints)

      .catch(function (err) {

        console.warn(
          'Preferred camera request failed, falling back:',
          err
        );

        // Fall back to any available camera. This always
        // resolves to a real MediaStream (or rejects), so the
        // .then() below never has to guess what it received.

        return navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

      })

      .then(function (stream) {

        currentStream = stream;
        video.srcObject = stream;

        statusMsg.textContent = '';

      })

      .catch(function (err) {

        console.error(
          'Camera error:',
          err
        );


        var message =
          err.message ||
          'Unable to access camera';


        if (err.name === 'NotAllowedError') {

          message =
            'Permission denied. Please allow camera access in your browser settings and reload the page.';

        }

        else if (err.name === 'NotFoundError') {

          message =
            'No camera was found. Please make sure your webcam or phone camera is available.';

        }

        else if (err.name === 'NotReadableError') {

          message =
            'The camera is already being used by another application.';

        }

        else if (err.name === 'SecurityError') {

          message =
            'Camera access is blocked by the browser security policy.';

        }


        statusMsg.textContent =
          'Camera error: ' +
          message;

      });

  }



  // ============================================================
  // CAMERA PREVIEW / OVERLAY
  // ============================================================

  function resizeOverlayCanvas() {

    var rect =
      video.parentElement
        .getBoundingClientRect();


    overlayCanvas.width =
      rect.width;

    overlayCanvas.height =
      rect.height;


    renderOverlayPreview();

  }


  function renderOverlayPreview() {

    overlayCtx.clearRect(
      0,
      0,
      overlayCanvas.width,
      overlayCanvas.height
    );


    currentTheme.draw(
      overlayCtx,
      overlayCanvas.width,
      overlayCanvas.height
    );

  }


  window.addEventListener(
    'resize',
    resizeOverlayCanvas
  );


  // ============================================================
  // COUNTDOWN + CAPTURE
  // ============================================================

  captureBtn.addEventListener(
    'click',
    function () {

      if (!currentStream) {

        statusMsg.textContent =
          'Camera is not ready yet.';

        return;

      }


      captureBtn.disabled =
        true;


      runPhotoSession(
        currentLayout.shots,
        function (shots) {

          finalizeCapture(shots);

          captureBtn.disabled =
            false;

        }
      );

    }
  );


  function runCountdown(
    n,
    onDone
  ) {

    countdownEl.classList
      .remove('hidden');


    countdownEl.textContent =
      n;


    var timer =
      setInterval(
        function () {

          n -= 1;


          if (n <= 0) {

            clearInterval(timer);

            countdownEl.classList
              .add('hidden');


            onDone();

          }

          else {

            countdownEl.textContent =
              n;

          }

        },
        800
      );

  }


  // ============================================================
  // MULTI-SHOT SESSION
  // ============================================================
  // Layouts with more than one shot (Photostrip, Grid) run the
  // countdown repeatedly, collecting one raw graded frame per
  // shot, before handing everything to the layout's compose
  // function to build the final image.

  function runPhotoSession(shotCount, onAllDone) {

    var shots = [];

    function nextShot() {

      runCountdown(3, function () {

        shots.push(captureRawShot());

        if (shots.length < shotCount) {

          statusMsg.textContent =
            'Shot ' + shots.length + ' of ' + shotCount +
            ' captured — get ready for the next one!';

          setTimeout(nextShot, 900);

        } else {

          onAllDone(shots);

        }

      });

    }

    nextShot();

  }


  // ============================================================
  // MANUAL COLOR GRADE (pixel-level, not ctx.filter)
  // ============================================================
  // ctx.filter (the canvas equivalent of CSS filter) is not
  // reliably supported across Safari/iOS versions — on some
  // devices it silently does nothing, which is why the live
  // preview (CSS filter on the <video> element) looked right
  // but the downloaded PNG came out with no color grade at all.
  // This applies the same look by editing pixel values directly,
  // so it always bakes into the exported image.

  function clamp255(v) {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return v;
  }

  function applyColorGrade(ctx, w, h, grade) {

    if (!grade) return;

    var imageData = ctx.getImageData(0, 0, w, h);
    var data = imageData.data;

    var brightness = grade.brightness != null ? grade.brightness : 1;
    var contrast = grade.contrast != null ? grade.contrast : 1;
    var saturate = grade.saturate != null ? grade.saturate : 1;
    var sepiaAmt = grade.sepia || 0;
    var grayAmt = grade.grayscale || 0;

    for (var i = 0; i < data.length; i += 4) {

      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];

      // brightness
      r *= brightness;
      g *= brightness;
      b *= brightness;

      // contrast (centered on mid-gray)
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      // saturation (blend toward/away from luminance)
      var lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * saturate;
      g = lum + (g - lum) * saturate;
      b = lum + (b - lum) * saturate;

      // sepia (blend toward a sepia-mapped color by amount)
      if (sepiaAmt > 0) {
        var sr = r * 0.393 + g * 0.769 + b * 0.189;
        var sg = r * 0.349 + g * 0.686 + b * 0.168;
        var sb = r * 0.272 + g * 0.534 + b * 0.131;
        r = r + (sr - r) * sepiaAmt;
        g = g + (sg - g) * sepiaAmt;
        b = b + (sb - b) * sepiaAmt;
      }

      // grayscale (blend toward luminance by amount)
      if (grayAmt > 0) {
        var l2 = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r + (l2 - r) * grayAmt;
        g = g + (l2 - g) * grayAmt;
        b = b + (l2 - b) * grayAmt;
      }

      data[i] = clamp255(r);
      data[i + 1] = clamp255(g);
      data[i + 2] = clamp255(b);

    }

    ctx.putImageData(imageData, 0, 0);

  }


  // ============================================================
  // CAPTURE ONE RAW (MIRRORED + GRADED) SHOT
  // ============================================================
  // Returns a standalone canvas — no frame/border drawn yet.
  // Multi-shot layouts call this once per shot, then compose
  // them together; the Classic layout uses it for its one shot.

  function captureRawShot() {

    var vw =
      video.videoWidth ||
      1280;

    var vh =
      video.videoHeight ||
      960;

    var shotCanvas =
      document.createElement('canvas');

    shotCanvas.width = vw;
    shotCanvas.height = vh;

    var ctx =
      shotCanvas.getContext('2d');


    // ========================================================
    // MIRROR FRONT CAMERA
    // ========================================================

    if (facingMode === 'user') {

      ctx.save();
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.restore();

    } else {

      ctx.drawImage(video, 0, 0, vw, vh);

    }


    // ========================================================
    // BAKE IN THEME COLOR GRADE (pixel-level, always applies)
    // ========================================================

    applyColorGrade(
      ctx,
      vw,
      vh,
      currentTheme && currentTheme.grade
    );


    // ========================================================
    // FLASH EFFECT (once per shot)
    // ========================================================

    flashEl.classList.remove('on');
    void flashEl.offsetWidth;
    flashEl.classList.add('on');

    return shotCanvas;

  }


  // ============================================================
  // COLOR HELPER — pick readable text color for a swatch
  // ============================================================

  function isLightColor(hex) {

    if (!hex) return true;

    var c = hex.replace('#', '');

    if (c.length === 3) {
      c = c.split('').map(function (ch) { return ch + ch; }).join('');
    }

    var r = parseInt(c.substring(0, 2), 16);
    var g = parseInt(c.substring(2, 4), 16);
    var b = parseInt(c.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return true;

    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return lum > 0.6;

  }


  // ============================================================
  // COMPOSE: CLASSIC (1 shot, full decorative frame)
  // ============================================================

  function composeClassic(shots, theme, outCanvas) {

    var shot = shots[0];

    outCanvas.width = shot.width;
    outCanvas.height = shot.height;

    var ctx = outCanvas.getContext('2d');

    ctx.drawImage(shot, 0, 0);

    theme.draw(ctx, outCanvas.width, outCanvas.height);

  }


  // ============================================================
  // COMPOSE: PHOTOSTRIP (shots stacked vertically)
  // ============================================================

  function composePhotostrip(shots, theme, outCanvas) {

    var cellW = shots[0].width;
    var cellH = shots[0].height;

    var pad = Math.round(cellW * 0.04);
    var outerBorder = Math.round(cellW * 0.05);
    var footerH = Math.round(cellH * 0.22);

    var totalW = cellW + outerBorder * 2;
    var totalH =
      outerBorder +
      (cellH + pad) * shots.length +
      footerH;

    outCanvas.width = totalW;
    outCanvas.height = totalH;

    var ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    var y = outerBorder;

    for (var i = 0; i < shots.length; i++) {

      ctx.drawImage(shots[i], outerBorder, y, cellW, cellH);

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = Math.max(2, cellW * 0.006);
      ctx.strokeRect(outerBorder, y, cellW, cellH);

      y += cellH + pad;

    }

    // footer band in the theme's accent color
    ctx.fillStyle = theme.swatch || '#1a1a1a';
    ctx.fillRect(0, totalH - footerH, totalW, footerH);

    ctx.fillStyle = isLightColor(theme.swatch) ? '#1a1a1a' : '#ffffff';
    ctx.font = '700 ' + Math.round(footerH * 0.42) + 'px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAPBOOTH', totalW / 2, totalH - footerH / 2);

    // outer frame
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(3, cellW * 0.012);
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      totalW - ctx.lineWidth,
      totalH - ctx.lineWidth
    );

  }


  // ============================================================
  // COMPOSE: GRID (2x2 shots)
  // ============================================================

  function composeGrid(shots, theme, outCanvas) {

    var cellW = shots[0].width;
    var cellH = shots[0].height;

    var pad = Math.round(cellW * 0.04);
    var outerBorder = Math.round(cellW * 0.05);
    var footerH = Math.round(cellH * 0.16);

    var totalW = outerBorder * 2 + cellW * 2 + pad;
    var totalH =
      outerBorder +
      cellH * 2 + pad +
      footerH;

    outCanvas.width = totalW;
    outCanvas.height = totalH;

    var ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    var positions = [
      [outerBorder, outerBorder],
      [outerBorder + cellW + pad, outerBorder],
      [outerBorder, outerBorder + cellH + pad],
      [outerBorder + cellW + pad, outerBorder + cellH + pad]
    ];

    for (var i = 0; i < shots.length && i < 4; i++) {

      var pos = positions[i];

      ctx.drawImage(shots[i], pos[0], pos[1], cellW, cellH);

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = Math.max(2, cellW * 0.006);
      ctx.strokeRect(pos[0], pos[1], cellW, cellH);

    }

    ctx.fillStyle = theme.swatch || '#1a1a1a';
    ctx.fillRect(0, totalH - footerH, totalW, footerH);

    ctx.fillStyle = isLightColor(theme.swatch) ? '#1a1a1a' : '#ffffff';
    ctx.font = '700 ' + Math.round(footerH * 0.5) + 'px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAPBOOTH', totalW / 2, totalH - footerH / 2);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(3, cellW * 0.012);
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      totalW - ctx.lineWidth,
      totalH - ctx.lineWidth
    );

  }


  // ============================================================
  // FINALIZE CAPTURE — compose, save, download, session gallery
  // ============================================================

  function finalizeCapture(shots) {

    currentLayout.compose(
      shots,
      currentTheme,
      captureCanvas
    );

    var dataUrl =
      captureCanvas.toDataURL('image/png');

    // Store latest photo
    lastDownloadUrl = dataUrl;

    // Show save/download button
    downloadBtn.classList.remove('hidden');

    addToSessionGallery(dataUrl);

    // ========================================================
    // SAVE TO GOOGLE DRIVE
    // ========================================================

    savePhotoToDrive(dataUrl);

  }


  // ============================================================
  // SESSION GALLERY (this browser tab only — nothing persisted)
  // ============================================================

  var sessionShots = [];

  function addToSessionGallery(dataUrl) {

    sessionShots.unshift(dataUrl);

    renderSessionGallery();

  }

  function renderSessionGallery() {

    if (!sessionGalleryStrip) return;

    if (sessionShots.length === 0) {

      sessionGalleryStrip.innerHTML =
        '<p class="session-gallery__empty">Photos you take this session will show up here — tap one to open or save it again.</p>';

      return;

    }

    sessionGalleryStrip.innerHTML = '';

    sessionShots.forEach(function (url, idx) {

      var link = document.createElement('a');

      link.className = 'session-gallery__item';
      link.href = url;
      link.download =
        'snapbooth_' + (sessionShots.length - idx) + '_' + Date.now() + '.png';
      link.target = '_blank';
      link.rel = 'noopener';

      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Photo ' + (sessionShots.length - idx);
      img.loading = 'lazy';

      link.appendChild(img);
      sessionGalleryStrip.appendChild(link);

    });

  }


  // ============================================================
  // DOWNLOAD / SAVE PHOTO
  // MOBILE FRIENDLY
  // ============================================================

  downloadBtn.addEventListener(
    'click',
    function () {

      /*
       * Make sure there is actually
       * a captured photo.
       */

      if (
        !captureCanvas.width ||
        !captureCanvas.height
      ) {

        /*
         * Fallback for older behavior.
         */

        if (!lastDownloadUrl) {
          return;
        }

      }


      statusMsg.textContent =
        'Preparing your photo...';


      /*
       * Convert the canvas into a real
       * PNG Blob.
       *
       * This is more reliable on mobile
       * than downloading a data URL.
       */

      captureCanvas.toBlob(
        function (blob) {

          if (!blob) {

            statusMsg.textContent =
              'Unable to prepare the photo.';

            return;

          }


          var filename =
            'snapbooth_' +
            currentTheme.id +
            '_' +
            Date.now() +
            '.png';


          // ==================================================
          // TRY MOBILE SHARE / SAVE
          // ==================================================

          if (
            navigator.share &&
            navigator.canShare
          ) {

            try {

              var file =
                new File(
                  [blob],
                  filename,
                  {
                    type: 'image/png'
                  }
                );


              /*
               * Check whether the browser
               * supports sharing image files.
               */

              if (
                navigator.canShare({
                  files: [file]
                })
              ) {

                navigator.share({

                  files: [file],

                  title:
                    'Your Snapbooth Photo',

                  text:
                    'Your Snapbooth photo'

                })

                .then(
                  function () {

                    statusMsg.textContent =
                      'Photo ready to save or share!';

                  }
                )

                .catch(
                  function (err) {

                    /*
                     * User simply closed
                     * the share menu.
                     */

                    if (
                      err &&
                      err.name ===
                      'AbortError'
                    ) {

                      statusMsg.textContent =
                        '';

                      return;

                    }


                    console.warn(
                      'Share failed:',
                      err
                    );


                    openPhotoForSaving(
                      blob,
                      filename
                    );

                  }
                );


                return;

              }

            }

            catch (err) {

              console.warn(
                'File sharing unavailable:',
                err
              );

            }

          }


          // ==================================================
          // FALLBACK
          // ==================================================

          openPhotoForSaving(
            blob,
            filename
          );

        },

        'image/png'
      );

    }
  );


  // ============================================================
  // OPEN PHOTO FOR MOBILE SAVING
  // ============================================================

  function openPhotoForSaving(
    blob,
    filename
  ) {

    var imageUrl =
      URL.createObjectURL(
        blob
      );


    /*
     * Try opening the photo in a
     * separate browser tab.
     *
     * iPhone:
     * Long press → Save to Photos
     *
     * Android:
     * Long press → Download image
     */

    var newWindow =
      window.open(
        imageUrl,
        '_blank'
      );


    // ========================================================
    // POPUP BLOCKED
    // ========================================================

    if (!newWindow) {

      var a =
        document.createElement('a');


      a.href =
        imageUrl;


      a.download =
        filename;


      a.target =
        '_blank';


      document.body.appendChild(
        a
      );


      a.click();


      document.body.removeChild(
        a
      );


      statusMsg.textContent =
        'Your photo is ready.';


    }

    else {

      statusMsg.textContent =
        'Your photo is ready. Press and hold the photo to save it.';

    }


    /*
     * Keep the Blob URL alive for a while.
     *
     * This is important on mobile browsers.
     */

    setTimeout(
      function () {

        URL.revokeObjectURL(
          imageUrl
        );

      },
      60000
    );

  }


  // ============================================================
  // SAVE TO GOOGLE DRIVE
  // ============================================================

  function savePhotoToDrive(
    dataUrl
  ) {

    statusMsg.textContent =
      'Saving photo...';


    if (
      !APPS_SCRIPT_URL ||
      APPS_SCRIPT_URL.indexOf('PASTE_YOUR') === 0
    ) {

      statusMsg.textContent =
        'Save skipped: set APPS_SCRIPT_URL at the top of script.js to your deployed Web App /exec URL.';

      return;

    }


    var filename =
      'snapbooth_' +
      currentTheme.id +
      '_' +
      Date.now() +
      '.png';


    var body =
      new URLSearchParams();


    body.append(
      'photo',
      dataUrl
    );


    body.append(
      'theme',
      currentTheme.id
    );


    body.append(
      'filename',
      filename
    );


    // A form-encoded body is a "simple request" so no CORS preflight
    // is triggered, which keeps this working against Apps Script.

    fetch(
      APPS_SCRIPT_URL,
      {
        method: 'POST',
        body: body
      }
    )

      .then(
        function (response) {

          if (!response.ok) {

            throw new Error(
              'Server responded with ' +
              response.status
            );

          }

          return response.json();

        }
      )

      .then(
        function (result) {

          if (
            result &&
            result.success
          ) {

            statusMsg.textContent =
              'Photo saved successfully!';

          }

          else {

            statusMsg.textContent =
              'Save failed: ' +
              (
                result &&
                result.error
                  ? result.error
                  : 'Unknown error'
              );

          }

        }
      )

      .catch(
        function (err) {

          statusMsg.textContent =
            'Save failed: ' +
            (
              err &&
              err.message
                ? err.message
                : 'Network error'
            );

        }
      );

  }


  // ============================================================
  // CLASSIC FRAME
  // ============================================================

  function drawClassicFrame(
    ctx,
    w,
    h
  ) {

    var border =
      w * 0.045;


    var bottomStrip =
      h * 0.14;


    ctx.save();


    ctx.strokeStyle =
      '#ffffff';


    ctx.lineWidth =
      border * 2;


    ctx.strokeRect(
      0,
      0,
      w,
      h
    );


    ctx.fillStyle =
      '#ffffff';


    ctx.fillRect(
      0,
      h - bottomStrip,
      w,
      bottomStrip
    );


    ctx.strokeStyle =
      '#1a1a1a';


    ctx.lineWidth =
      Math.max(
        2,
        w * 0.004
      );


    ctx.strokeRect(
      border,
      border,
      w - border * 2,
      h - bottomStrip - border
    );


    ctx.fillStyle =
      '#1a1a1a';


    ctx.font =
      '700 ' +
      Math.round(h * 0.055) +
      'px Fredoka, sans-serif';


    ctx.textAlign =
      'center';


    ctx.textBaseline =
      'middle';


    ctx.fillText(
      'SNAPBOOTH',
      w / 2,
      h - bottomStrip / 2
    );


    drawTape(
      ctx,
      w * 0.08,
      h * 0.06,
      w * 0.09,
      -8
    );


    drawTape(
      ctx,
      w * 0.92,
      h * 0.06,
      w * 0.09,
      8
    );


    ctx.restore();

  }


  // ============================================================
  // TAPE
  // ============================================================

  function drawTape(
    ctx,
    cx,
    cy,
    size,
    angleDeg
  ) {

    ctx.save();


    ctx.translate(
      cx,
      cy
    );


    ctx.rotate(
      angleDeg *
      Math.PI /
      180
    );


    ctx.fillStyle =
      'rgba(255, 214, 232, 0.85)';


    ctx.fillRect(
      -size / 2,
      -size / 5,
      size,
      size / 2.5
    );


    ctx.restore();

  }


  // ============================================================
  // NEON FRAME
  // ============================================================

  function drawNeonFrame(
    ctx,
    w,
    h
  ) {

    var colors = [
      '#ff2fd0',
      '#2ff0ff',
      '#fff02f'
    ];


    var border =
      w * 0.03;


    ctx.save();


    for (
      var i = 0;
      i < colors.length;
      i++
    ) {

      ctx.shadowColor =
        colors[i];


      ctx.shadowBlur =
        20 - i * 5;


      ctx.strokeStyle =
        colors[i];


      ctx.lineWidth =
        border -
        i * (border / 4);


      ctx.strokeRect(
        border / 2 + i * 2,
        border / 2 + i * 2,
        w - border - i * 4,
        h - border - i * 4
      );

    }


    ctx.shadowBlur =
      0;


    drawStar(
      ctx,
      w * 0.09,
      h * 0.1,
      14,
      '#fff02f'
    );


    drawStar(
      ctx,
      w * 0.91,
      h * 0.1,
      14,
      '#2ff0ff'
    );


    drawStar(
      ctx,
      w * 0.09,
      h * 0.9,
      14,
      '#ff2fd0'
    );


    drawStar(
      ctx,
      w * 0.91,
      h * 0.9,
      14,
      '#fff02f'
    );


    ctx.fillStyle =
      '#ffffff';


    ctx.font =
      '700 ' +
      Math.round(h * 0.05) +
      'px Fredoka, sans-serif';


    ctx.textAlign =
      'center';


    ctx.shadowColor =
      '#ff2fd0';


    ctx.shadowBlur =
      12;


    ctx.fillText(
      'PARTY MODE',
      w / 2,
      h * 0.08
    );


    ctx.restore();

  }


  // ============================================================
  // STAR
  // ============================================================

  function drawStar(
    ctx,
    cx,
    cy,
    r,
    color
  ) {

    ctx.save();


    ctx.translate(
      cx,
      cy
    );


    ctx.fillStyle =
      color;


    ctx.beginPath();


    for (
      var i = 0;
      i < 5;
      i++
    ) {

      var angle =
        (i * 4 * Math.PI) / 5 -
        Math.PI / 2;


      var x =
        Math.cos(angle) * r;


      var y =
        Math.sin(angle) * r;


      if (i === 0) {

        ctx.moveTo(
          x,
          y
        );

      }

      else {

        ctx.lineTo(
          x,
          y
        );

      }

    }


    ctx.closePath();


    ctx.fill();


    ctx.restore();

  }


  // ============================================================
  // FLORAL FRAME
  // ============================================================

  function drawFloralFrame(
    ctx,
    w,
    h
  ) {

    var border =
      w * 0.035;


    ctx.save();


    ctx.strokeStyle =
      '#ffe3ee';


    ctx.lineWidth =
      border * 1.6;


    ctx.strokeRect(
      0,
      0,
      w,
      h
    );


    ctx.strokeStyle =
      '#d9a441';


    ctx.lineWidth =
      Math.max(
        2,
        w * 0.003
      );


    ctx.strokeRect(
      border,
      border,
      w - border * 2,
      h - border * 2
    );


    var corners = [

      [
        w * 0.08,
        h * 0.08
      ],

      [
        w * 0.92,
        h * 0.08
      ],

      [
        w * 0.08,
        h * 0.92
      ],

      [
        w * 0.92,
        h * 0.92
      ]

    ];


    corners.forEach(
      function (c) {

        drawFlower(
          ctx,
          c[0],
          c[1],
          w * 0.045
        );

      }
    );


    ctx.restore();

  }


  // ============================================================
  // FLOWER
  // ============================================================

  function drawFlower(
    ctx,
    cx,
    cy,
    r
  ) {

    var petalColors = [

      '#ff9fc0',
      '#ffd6e8',
      '#ffb3d1',
      '#ffc2dc'

    ];


    ctx.save();


    ctx.translate(
      cx,
      cy
    );


    for (
      var i = 0;
      i < 5;
      i++
    ) {

      ctx.save();


      ctx.rotate(
        (i * 2 * Math.PI) / 5
      );


      ctx.fillStyle =
        petalColors[
          i % petalColors.length
        ];


      ctx.beginPath();


      ctx.ellipse(
        0,
        -r * 0.6,
        r * 0.42,
        r * 0.62,
        0,
        0,
        Math.PI * 2
      );


      ctx.fill();


      ctx.restore();

    }


    ctx.fillStyle =
      '#ffd166';


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      r * 0.32,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.restore();

  }


  // ============================================================
  // BIRTHDAY FRAME
  // ============================================================

  function drawBirthdayFrame(
    ctx,
    w,
    h
  ) {

    var border =
      w * 0.03;


    ctx.save();


    ctx.strokeStyle =
      '#ffc857';


    ctx.lineWidth =
      border * 1.4;


    ctx.strokeRect(
      0,
      0,
      w,
      h
    );


    var confettiColors = [

      '#ff6b57',
      '#06a77d',
      '#ffc857',
      '#2ff0ff',
      '#ff2fd0'

    ];


    var rng =
      mulberry32(42);


    for (
      var i = 0;
      i < 40;
      i++
    ) {

      var x =
        rng() * w;


      var y =
        rng() * h;


      if (
        x > border * 2 &&
        x < w - border * 2 &&
        y > h * 0.18 &&
        y < h - border * 2
      ) {

        continue;

      }


      ctx.fillStyle =
        confettiColors[
          i % confettiColors.length
        ];


      ctx.save();


      ctx.translate(
        x,
        y
      );


      ctx.rotate(
        rng() * Math.PI
      );


      ctx.fillRect(
        -4,
        -4,
        8,
        8
      );


      ctx.restore();

    }


    drawBalloon(
      ctx,
      w * 0.09,
      h * 0.85,
      w * 0.045,
      '#ff6b57'
    );


    drawBalloon(
      ctx,
      w * 0.91,
      h * 0.85,
      w * 0.045,
      '#06a77d'
    );


    ctx.fillStyle =
      '#ffffff';


    ctx.fillRect(
      w * 0.18,
      h * 0.03,
      w * 0.64,
      h * 0.12
    );


    ctx.strokeStyle =
      '#1a1a1a';


    ctx.lineWidth =
      2;


    ctx.strokeRect(
      w * 0.18,
      h * 0.03,
      w * 0.64,
      h * 0.12
    );


    ctx.fillStyle =
      '#1a1a1a';


    ctx.font =
      '700 ' +
      Math.round(h * 0.06) +
      'px Fredoka, sans-serif';


    ctx.textAlign =
      'center';


    ctx.textBaseline =
      'middle';


    ctx.fillText(
      'HAPPY BIRTHDAY!',
      w / 2,
      h * 0.09
    );


    ctx.restore();

  }


  // ============================================================
  // BALLOON
  // ============================================================

  function drawBalloon(
    ctx,
    cx,
    cy,
    r,
    color
  ) {

    ctx.save();


    ctx.fillStyle =
      color;


    ctx.beginPath();


    ctx.ellipse(
      cx,
      cy,
      r * 0.75,
      r,
      0,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.strokeStyle =
      '#1a1a1a';


    ctx.lineWidth =
      1.5;


    ctx.beginPath();


    ctx.moveTo(
      cx,
      cy + r
    );


    ctx.quadraticCurveTo(
      cx + r * 0.4,
      cy + r * 1.6,
      cx,
      cy + r * 2.2
    );


    ctx.stroke();


    ctx.restore();

  }


  // ============================================================
  // HOLIDAY FRAME
  // ============================================================

  function drawHolidayFrame(
    ctx,
    w,
    h
  ) {

    var border =
      w * 0.03;


    ctx.save();


    ctx.strokeStyle =
      '#0f5132';


    ctx.lineWidth =
      border;


    ctx.strokeRect(
      0,
      0,
      w,
      h
    );


    ctx.strokeStyle =
      '#c1272d';


    ctx.lineWidth =
      border * 0.4;


    ctx.strokeRect(
      border * 0.6,
      border * 0.6,
      w - border * 1.2,
      h - border * 1.2
    );


    var bulbColors = [

      '#ff6b57',
      '#ffc857',
      '#2ff0ff',
      '#ff2fd0',
      '#06a77d'

    ];


    var y =
      h * 0.08;


    ctx.strokeStyle =
      '#1a1a1a';


    ctx.lineWidth =
      2;


    ctx.beginPath();


    ctx.moveTo(
      border,
      y
    );


    for (
      var x = border;
      x <= w - border;
      x += w / 14
    ) {

      ctx.quadraticCurveTo(
        x + w / 28,
        y + 10,
        x + w / 14,
        y
      );

    }


    ctx.stroke();


    var idx = 0;


    for (
      var bx = border + w / 28;
      bx <= w - border;
      bx += w / 14
    ) {

      ctx.save();


      ctx.shadowColor =
        bulbColors[
          idx % bulbColors.length
        ];


      ctx.shadowBlur =
        10;


      ctx.fillStyle =
        bulbColors[
          idx % bulbColors.length
        ];


      ctx.beginPath();


      ctx.arc(
        bx,
        y + 8,
        6,
        0,
        Math.PI * 2
      );


      ctx.fill();


      ctx.restore();


      idx++;

    }


    drawSnowflake(
      ctx,
      w * 0.08,
      h * 0.85,
      w * 0.035
    );


    drawSnowflake(
      ctx,
      w * 0.92,
      h * 0.85,
      w * 0.035
    );


    ctx.restore();

  }


  // ============================================================
  // SNOWFLAKE
  // ============================================================

  function drawSnowflake(
    ctx,
    cx,
    cy,
    r
  ) {

    ctx.save();


    ctx.translate(
      cx,
      cy
    );


    ctx.strokeStyle =
      '#ffffff';


    ctx.lineWidth =
      2;


    for (
      var i = 0;
      i < 6;
      i++
    ) {

      ctx.save();


      ctx.rotate(
        (i * Math.PI) / 3
      );


      ctx.beginPath();


      ctx.moveTo(
        0,
        -r
      );


      ctx.lineTo(
        0,
        r
      );


      ctx.moveTo(
        0,
        -r * 0.5
      );


      ctx.lineTo(
        -r * 0.25,
        -r * 0.75
      );


      ctx.moveTo(
        0,
        -r * 0.5
      );


      ctx.lineTo(
        r * 0.25,
        -r * 0.75
      );


      ctx.stroke();


      ctx.restore();

    }


    ctx.restore();

  }


  // ============================================================
  // FILMSTRIP FRAME
  // ============================================================

  function drawFilmstripFrame(
    ctx,
    w,
    h
  ) {

    var barWidth =
      w * 0.09;


    var holeSize =
      barWidth * 0.36;


    ctx.save();


    ctx.fillStyle =
      '#1a1a1a';


    ctx.fillRect(
      0,
      0,
      barWidth,
      h
    );


    ctx.fillRect(
      w - barWidth,
      0,
      barWidth,
      h
    );


    ctx.fillStyle =
      '#ffffff';


    var holeCount =
      Math.round(
        h /
        (holeSize * 2.2)
      );


    for (
      var i = 0;
      i < holeCount;
      i++
    ) {

      var hy =
        (i + 0.5) *
        (h / holeCount);


      roundRect(
        ctx,
        barWidth / 2 - holeSize / 2,
        hy - holeSize / 2,
        holeSize,
        holeSize,
        3
      );


      ctx.fill();


      roundRect(
        ctx,
        w - barWidth / 2 - holeSize / 2,
        hy - holeSize / 2,
        holeSize,
        holeSize,
        3
      );


      ctx.fill();

    }


    ctx.fillStyle =
      '#1a1a1a';


    ctx.fillRect(
      0,
      0,
      w,
      h * 0.05
    );


    ctx.fillRect(
      0,
      h * 0.95,
      w,
      h * 0.05
    );


    ctx.restore();

  }


  // ============================================================
  // ROUND RECTANGLE
  // ============================================================

  function roundRect(
    ctx,
    x,
    y,
    w,
    h,
    r
  ) {

    ctx.beginPath();


    ctx.moveTo(
      x + r,
      y
    );


    ctx.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      r
    );


    ctx.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      r
    );


    ctx.arcTo(
      x,
      y + h,
      x,
      y,
      r
    );


    ctx.arcTo(
      x,
      y,
      x + w,
      y,
      r
    );


    ctx.closePath();

  }


  // ============================================================
  // DETERMINISTIC RANDOM GENERATOR
  // ============================================================

  function mulberry32(
    seed
  ) {

    return function () {

      seed |= 0;


      seed =
        (
          seed +
          0x6D2B79F5
        ) | 0;


      var t =
        Math.imul(
          seed ^ (seed >>> 15),
          1 | seed
        );


      t =
        (
          t +
          Math.imul(
            t ^ (t >>> 7),
            61 | t
          )
        ) ^ t;


      return (
        (
          t ^
          (t >>> 14)
        ) >>> 0
      ) / 4294967296;

    };

  }


  // ============================================================
  // INITIALIZATION
  // ============================================================

  buildThemeRail();

  buildLayoutRail();

  applyLiveFilter(currentTheme);


  // Start with any available camera.
  startCamera();


  video.addEventListener(
    'loadedmetadata',
    resizeOverlayCanvas
  );


  window.addEventListener(
    'load',
    resizeOverlayCanvas
  );


})();
