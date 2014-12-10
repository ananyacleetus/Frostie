var EM = EM || {};

EM.Media = (function () {

    var enabled = false;

    function slideEnter() {
        var $slide;

        if (!enabled) {
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
            console.warn('no slide returned by scene.getCurrentSlide() function');
            return;
        } 
        
        $slide = $($slide); //failsafe in case theme sends string instead of the expected jquery object 



        $slide.find('video').each(function () {
            var $this = $(this);

            if (this.readyState === 0) {
                this.load();
                $this.on('loadeddata', function () { $(this).closest('.edit-wrapper').removeClass('loading'); }).closest('.edit-wrapper').addClass('loading');
            }

            if (this.getAttribute('data-mediaautoplay') === 'true') {
                try {
                    this.play();
                } catch (e) {
                    console.log('failed to play media');
                }
            }

        });
      
    }


    $(document).ready(function () {
        $('#scene').on('transitionDone', slideEnter);
        //  $('#scene').on('transitionStart', slideExit);

        $('#scene').on('transitionStart', stopAllMedia); //stop all videos/audio from playing in other slides

    });


    //stops mp3 and mp4 files sfrom playing inside of the sd-element-media elements
    function stopAllMedia() {
        $('video.sd-element-media').each(function () {
            if (this.pause && !this.paused) {

                this.pause();
                this.load();
            }
        });
    }

    function toggleEnabled(isEnabled) {
        enabled = isEnabled;
    }

    return {
        stopAllMedia: stopAllMedia,
        toggleEnabled: toggleEnabled
    }

})();
