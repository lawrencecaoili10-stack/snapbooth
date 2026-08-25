(function () {
  'use strict';

  // ============================================================
  // BACKEND ENDPOINT
  // ============================================================
  // Paste the /exec URL of your deployed Apps Script Web App here.
  // Deploy > Manage deployments > Web app > copy the URL ending in /exec

  var APPS_SCRIPT_URL = 'PASTE_YOUR_WEB_APP_EXEC_URL_HERE';

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
      draw: drawClassicFrame
    },
    {
      id: 'neon',
      name: 'Neon Party',
      swatch: '#ff2fd0',
      // punchy, oversaturated club-light look
      filter: 'saturate(165%) contrast(115%) brightness(103%) hue-rotate(-4deg)',
      draw: drawNeonFrame
    },
    {
      id: 'floral',
      name: 'Garden Floral',
      swatch: '#ffd6e8',
      // soft pastel, lifted shadows, gentle warmth
      filter: 'sepia(8%) saturate(112%) brightness(108%) contrast(96%)',
      draw: drawFloralFrame
    },
    {
      id: 'birthday',
      name: 'Birthday Bash',
      swatch: '#ffc857',
      // bright, vivid, high-energy party colors
      filter: 'saturate(148%) contrast(110%) brightness(106%)',
      draw: drawBirthdayFrame
    },
    {
      id: 'holiday',
      name: 'Holiday Lights',
      swatch: '#0f5132',
      // cozy warm glow, slightly muted highlights
      filter: 'sepia(18%) saturate(120%) brightness(101%) contrast(103%)',
      draw: drawHolidayFrame
    },
    {
      id: 'filmstrip',
      name: 'Film Strip',
      swatch: '#1a1a1a',
      // classic high-contrast black & white
      filter: 'grayscale(100%) contrast(120%) brightness(103%)',
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


      runCountdown(
        3,
        function () {

          takePhoto();

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
  // TAKE PHOTO
  // ============================================================

  function takePhoto() {

    var vw =
      video.videoWidth ||
      1280;


    var vh =
      video.videoHeight ||
      960;


    captureCanvas.width =
      vw;


    captureCanvas.height =
      vh;


    var ctx =
      captureCanvas
        .getContext('2d');


    // ========================================================
    // APPLY THEME COLOR FILTER
    // ========================================================
    // Canvas 2D context supports the same CSS filter syntax,
    // so the baked-in photo matches the live preview exactly.

    ctx.filter =
      (currentTheme && currentTheme.filter) ||
      'none';


    // ========================================================
    // MIRROR FRONT CAMERA
    // ========================================================

    if (facingMode === 'user') {

      ctx.save();


      ctx.translate(
        vw,
        0
      );


      ctx.scale(
        -1,
        1
      );


      ctx.drawImage(
        video,
        0,
        0,
        vw,
        vh
      );


      ctx.restore();

    }

    else {

      ctx.drawImage(
        video,
        0,
        0,
        vw,
        vh
      );

    }


    // Reset the filter before drawing the frame overlay —
    // the decorative border/stickers should stay crisp and
    // unaffected by the photo's color grade.

    ctx.filter = 'none';


    // ========================================================
    // DRAW SELECTED PHOTOBOOTH FRAME
    // ========================================================

    currentTheme.draw(
      ctx,
      vw,
      vh
    );


    // ========================================================
    // FLASH EFFECT
    // ========================================================

    flashEl.classList
      .remove('on');


    void flashEl.offsetWidth;


    flashEl.classList
      .add('on');


    // ========================================================
    // CONVERT CAPTURE TO PNG
    // ========================================================

    var dataUrl =
      captureCanvas.toDataURL(
        'image/png'
      );


    // Store latest photo
    lastDownloadUrl =
      dataUrl;


    // Show save/download button
    downloadBtn.classList
      .remove('hidden');


    // ========================================================
    // SAVE TO GOOGLE DRIVE
    // ========================================================

    savePhotoToDrive(
      dataUrl
    );

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
      APPS_SCRIPT_URL.indexOf('https://script.google.com/macros/library/d/131RA5UUg9EFrs3ktC5F5YVP1ysbg8eZdvlpUsjMZVI6HChzBV3wQ13JA/4') === 0
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
