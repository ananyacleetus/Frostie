


var EM_YoutubePlayer = (function () {

    function stopVideo($videoPlayer) {
        $videoPlayer.closest('#video-player-shield').addClass('hide');
        $videoPlayer.children('iframe').attr('src', '');
    }

    function attachHideVideoPlayer() {
        $(document.body).off('click mousewheel', hideVideoPlayer).one('click mousewheel', hideVideoPlayer);
    }

    function removeVideoPlayer() {
        var $videoPlayer = $(document.body).data('video-player');
            if ($videoPlayer && $videoPlayer.children('iframe').attr('src')) {
                stopVideo($videoPlayer);
            }
    }

    function hideVideoPlayer(event) {

        var $videoPlayer = $(document.body).data('video-player');
        var $target = $(event.originalEvent.target);

        if (event.target !== window && !$target.closest($videoPlayer).length && !$target.closest('.iframe-wrapper').length) {
            stopVideo($videoPlayer);
        }
        else {
            attachHideVideoPlayer();
        }
        event.stopPropagation();
        return false;
    }

    function showVideoPlayer() {
        var $videoElement = $(this).children('iframe');
        var $videoPlayer = $(document.body).data('video-player');
        var src;
        var delimeter;

        if (!$videoPlayer) {
            $videoPlayer = $('<div id="video-player"><iframe></iframe></div>').appendTo('body');
            $('body').data('video-player', $videoPlayer);
            $videoPlayer.wrap('<div id="video-player-shield">');
        }
        $videoPlayer.css(this.getBoundingClientRect());


        src = $videoElement.attr('src');
        delimeter = src.indexOf('?') === -1 ? "?" : "&";
        $videoPlayer.children('iframe').attr('src', src + delimeter + 'autoplay=1');

        $videoPlayer.closest('#video-player-shield').removeClass('hide');

        $videoPlayer.click(function () {
            event.stopImmediatePropagation();
            return false;
        });

        attachHideVideoPlayer();
    }


    function handleSlideChange() {
        var $slide, errorMessage, slideNum, $videoElements, $autoplay;
        try {

            if (!window['scene']) {
                $.post("../present/logError", { source: "videopPlayer.js/handleSlideChange", message: "scene error: scene is not defined " });
                return;
            }
            if (!scene['getCurrentSlide']) {
                $.post("../present/logError", { source: "videopPlayer.js/handleSlideChange", message: "scene does not expose a getCurrentSlide function" });
                return;
            }

            $slide = scene.getCurrentSlide();

            if (!$slide || !$slide.length) {
               // try {
               //     slideNum = scene.currentSlideNum();
               // } catch (e) {
               //     slideNum = " scene.currentSlideNum() return error: " + e;
               // }

              //  $.post("../present/logError", { source: "videopPlayer.js/handleSlideChange", message: "scene.getCurrentSlide() did not return a slide. the current slide num is: " + slideNum });
              //  console.warn('no slide recevied');
                return;
            }
         $videoElements = $slide.children('.iframe-wrapper').children('.sd-element-video');

         //#patch for infographics with slide inside of slide
         if (!$videoElements.length && $slide.children('.slide').length) {
             $videoElements = $slide.children('.slide').children('.iframe-wrapper').children('.sd-element-video');
         }
         //#end infographics patch

         $autoplay = $videoElements.filter('[data-videoautoplay="true"]');

          
        if ($autoplay.length) {
            showVideoPlayer.apply($autoplay.closest('.edit-wrapper')[0]);
        }

        } catch (e) {

            console.log(e);
            //$.post("../present/logError", { source: "videopPlayer.js/handleSlideChange", message: e });
        }
    }

    $(document).ready(function () {
        $('body').on('click', '.iframe-wrapper', showVideoPlayer);

        $('#scene').on('transitionDone', handleSlideChange);
        $('#scene').on('transitionStart', removeVideoPlayer);
    
    });

    return {
        removeVideoPlayer: removeVideoPlayer,
        handleSlideChange: handleSlideChange
    }
})();