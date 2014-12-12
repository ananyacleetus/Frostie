
EM.Audio = (function () {
    var enabled = false;
    var isEditor = false;
    //var slidedeDeckInstance;
    // var stopDurations;
    var prevSlideNum = 0; // the slide that the player was on during the last slide change;
    var $jukebox;
    var IV_progress = false; //progress bar interval
    var loadingTracker = {
        counter: 0,
        decrement: function () {
            this.counter--;
            //console.log('load counter', this.counter);
            if (this.counter === 0) {
                $('body').triggerHandler('em-audio-loadfinish');
                // console.log('em-audio-loadfinish');
            }
        },
        increment: function () {
            this.counter++;
            // console.log('load counter', this.counter);
        },
        getCount: function () {
            return counter;
        }

    }

    function toggleEnabled(isEnabled) {
        enabled = isEnabled;
    }

    function init(slideDeck) {
        enabled = (window === window.top); //audio enabled by default if not in iframe
        // slidedeDeckInstance = slideDeck;
        // stopDurations = slidedeDeckInstance.slideSettings.map(function (i) {return i.stopduration || 4 });

        if (window["EM_Editor"] !== undefined) {
            isEditor = true;

        } else {
            $jukebox = $('<div id="jukebox" style="display:none;">');

            $(document.body).append($jukebox);

            loadAllAudioFromSlideDeck(slideDeck);
        }

        attachEventHandlers();
    }

    function getEditWrapper(audio) {
        var data = $(audio).data();
        return $('#scene [data-uid="' + data.parentUid + '"]') || $();
    }

    function loadsettings(data) {
        //audiostop: audiostop, audioautoplay: data.audioautoplay, audiostarttime: data.audiostarttime, audiostoptime: data.audiostoptime, audiosrc: data.audiosrc, audioloop: data.audioloop, isedit: data.isedit };
        $('#audio-url-txt').val(data.audiosrc).attr('title', getfileName(data.audiosrc));
        $('#select-audio-stop').val(data.audiostop);
        $('#audio-loop').prop('checked', data.audioloop);
        $('#audio-auto').prop('checked', data.audioautoplay);
        $('#audio-start-time').val(data.audiostarttime);
        $('#audio-stop-time').val(data.audiostoptime);
        $('#audio-stop-others').prop('checked', data.audiostopothers);
        $('#audio-save-btn').html(data.isedit ? 'UPDATE' : 'ADD');
    }

    function checkIncompatibles() {
        var data = getSettings();
        var isIncompatible = (data.audioloop && (data.audiostoptime.trim().length > 0 || data.audiostarttime.trim().length) > 0);

        $('#audio-incompatible').toggle(isIncompatible);
    }

    function getSettings() {
        var data = {};
        data.audiosrc = $('#audio-url-txt').val();
        data.audiostop = $('#select-audio-stop').val();
        data.audioloop = $('#audio-loop').prop('checked');
        data.audioautoplay = $('#audio-auto').prop('checked');
        data.audiostarttime = $('#audio-start-time').val();
        data.audiostoptime = $('#audio-stop-time').val();
        data.audiostopothers = $('#audio-stop-others').prop('checked');
        return data;
    }

    function clearAudioControls() {
        $('#audio-url-txt').val('');
        $('#select-audio-stop').val(-1);
        $('#audio-loop').prop('checked', false);
        $('#audio-auto').prop('checked', false);
        $('#audio-start-time').val('');
        $('#audio-stop-others').prop('checked', false);
    }

    function popuplateSlideselector() {
        var $Select = $('#select-audio-stop'),
        slideCount = EM_Document.$slideContainer.find('.slide-wrapper').length;

        $Select.empty();
        $Select.append('<option value="-1">none</option><option value="0">current slide</option>');
        for (var i = 1; i <= slideCount; i++) {
            $('<option></option>').attr("value", i).text(i).appendTo($Select);
        }
    }

    function getfileName(audiosrc) {
        var segments = [];
        if (!audiosrc) { return ''; }
        if (audiosrc.indexOf('&title=') !== -1) { //audio url with params..
            return audiosrc.split('&title=').pop();
        }
        if (audiosrc.indexOf('_emazeaudio_') !== -1) { // '_emazeaudio_'  is located between guid and originial file name for uploaded files
            return audiosrc.split('_emazeaudio_')[1];
        }
        segments = audiosrc.split('/');   // audio files linked to source outside of emaze storage
        return segments.length ? segments[segments.length - 1] : '';
    }


    function attachJuekboxEvents() {
        $jukebox.children().on('ended, pause', function () {

            var $wrapper;
            try {

                $wrapper = getEditWrapper(this);
                $wrapper.removeClass('sd-audio-play');
                if (!$wrapper.length) {
                    console.log('no wrapper');
                }
            } catch (e) {
                console.error(e);
            }
        }).on('play', function () {
            var $wrapper;
            try {

                $wrapper = getEditWrapper(this);
                $wrapper.addClass('sd-audio-play');

                if (!$wrapper.length) {
                    console.log('no wrapper');
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    function loadAllAudioFromSlideDeck(slideDeck) {
        var $slidesHtml, $slides, index, slideCount, interval;

        try {

            $slidesHtml = EM_slideDeck.slideDeckToHtmlFlat(slideDeck);
            $slides = $slidesHtml.children(':has(.sd-audio)');
            index = 0;
            slideCount = $slides.length;

            if (!slideCount) {
                return; //this should not happen but just in case.
            }
            addSlideAudioElementsToJukebox($($slides[index]));

            var interval = setInterval(function () { //space out adding of sound files to prevent chrome fro getting stuck in pending
                //  var d = new Date();
                index++;
                if (index === slideCount) { //stop the interval and attach events to the newly appended audio elements
                    clearInterval(interval);
                    attachJuekboxEvents();
                } else {
                    addSlideAudioElementsToJukebox($($slides[index]));
                    // console.log(index, (d.getMinutes() + ":" + d.getSeconds()));
                }

            }, 3000);

        } catch (e) {
            $.post("../present/logError", { source: "emaze.audio.js/loadAllAudioFromSlideDeck", message: e.message });
        }

    }

    function attachEventHandlers() {

        $('#audio-url-txt').on('change', function () {
            this.title = getfileName(this.value);
        }).dblclick(function () { this.select(); });

        if (!isEditor) { //remove first to prevent multiple event bindings on re-load
            $('#scene').off('click', '.sd-audio', handleAudioClick).on('click', '.sd-audio', handleAudioClick);

            $('#scene').off('contextmenu', '.sd-audio', handleContextMenu).on('contextmenu', '.sd-audio', handleContextMenu);

            $("#scene").off('transitionStart', handleSlideChange).on('transitionStart', handleSlideChange);



        } else {

            $("#audio-loop, #audio-start-time, #audio-stop-time").change(checkIncompatibles);
            //   debugInEditor();
            $('#btn-audio').on('sd-show', function () {
                var data, isedit;
                clearAudioControls();
                isedit = EM_Document.selected.$editWrapper.is('.sd-audio');

                //   if (EM_Document.selected.$editWrapper.is('.sd-audio')) {
                data = EM_Document.selected.$editWrapper.data();
                data.isedit = isedit;
                popuplateSlideselector();
                loadsettings(data);

                //  $(this).addClass('edit-audio'); //needed?
                //  $('#audio-save-btn > .title').html('UPDATE');
                //  } else {
                // clearAudioControls();
                //  $(this).removeClass('edit-audio'); //needed?
                //  $('#audio-save-btn > .title').html('SAVE');
                // }
            });


            function extractYoutubeVideoId(url) {
                var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                var match = url.match(regExp);
                if (match && match[2].length == 11) {
                    return match[2];
                } else {
                    //error
                }
            }

            $('#audio-save-btn').on('click', function () {
                var audioData = getSettings(), videoID;

                if (audioData.audiosrc.indexOf('youtube.com') !== -1) {
                    videoID = extractYoutubeVideoId(audioData.audiosrc);

                    (function ($editWrappers) { //closure to ensure that when ajax finishes the effects will be applied to the selected elements at tthe time that the function was called.
                        $.get("getYoutubeMP4", { videoID: videoID }, function (data) {
                            if (data === "ERROR") {
                                EM.JQError("Unable to convert the youtube link to audio format due to copyright restrictions. Please select a different sound source", "Copyright Notice");
                            } else {
                                //  console.log(data);
                                //  data = decodeURIComponent(data);
                                console.log(data);
                                audioData.audiosrc = data;
                                audioData.audio_ytid = videoID;
                                updateAudioElement($editWrappers, audioData);
                                $editWrappers.addClass('sd-audio');
                                window.setTimeout(EM_Menu.deSelectDropdown, 100);
                            }
                        }).error(function (jqXHR, textStatus, errorThrown) {
                            debugger;
                            EM.JQError("Unable to convert the youtube link to audio format.", "Error");
                        });

                    }(EM_Document.selected.$bothEditWrappers));

                } else {
                    updateAudioElement(EM_Document.selected.$bothEditWrappers, audioData);
                    EM_Document.selected.$bothEditWrappers.addClass('sd-audio');
                    window.setTimeout(EM_Menu.deSelectDropdown, 100);
                }
            });

            $('#audio-remove-btn').click(function () {
                removeAudio(EM_Document.selected.$bothEditWrappers);
                window.setTimeout(EM_Menu.deSelectDropdown, 100);
            });


        }

    }


    //#region editor

    function serializeDataByPrefix($obj, prefix) { //save an object into an element's data attributes. it filters properties of the object that are relevant to be saved.
        var data = $obj.data();
        var attributes = {};
        for (var prop in data) {
            if (prop.indexOf(prefix === 0)) {
                attributes["data-" + prop] = data[prop];
            }
        }
        $obj.attr(attributes);
    }

    //function serializeAudioData($audioWrapper) {
    //    var data = $audioWrapper.data();

    //    $audioWrapper.attr(serializeDataByPRefix(data, 'audio'));

    //    //$audioWrapper.attr({ 'data-audiostop': data.audiostop, 'data-audioautoplay': data.audioautoplay, 'data-audiostarttime': data.audiostarttime, 'data-audiostoptime': data.audiostoptime, 'data-audiosrc': data.audiosrc, 'data-audioloop': data.audioloop, 'data-audio_ytid': data.audio_ytid });
    //}

    function updateAudioSrc($wrapper, src) {
        var isAdd = !$wrapper.is('.sd-audio'),
            prevData = $wrapper.data(),
            audioData = prevData;

        audioData.audiosrc = src;

        if (isAdd) {
            $wrapper.addClass('sd-audio');
        }

        $wrapper.data(audioData);
        serializeDataByPrefix($wrapper, "audio");

        if ($wrapper.is('.slide > .edit-wrapper')) { //this function is bering called using $.each on audio upload done event. so we check to see if its bering applied to a wrapper in a slide before logging in history.
            EM_Editor.history.recordAction(isAdd ? audioUndoRedo : audioEditUndoRedo, { $wrapper: $wrapper.filter('.slide > .edit-wrapper'), audioData: audioData, prevData: prevData });
        }
        EM_Workspace.isDirty();
    }

    function updateAudioElement($wrapper, audioData, dontLogInHistory) {
        var isAdd = !$wrapper.is('.sd-audio'), data = $wrapper.data(),
            prevData = { audiostop: data.audiostop, audioautoplay: data.audioautoplay, audiostarttime: data.audiostarttime, audiostoptime: data.audiostoptime, audiosrc: data.audiosrc, audioloop: data.audioloop, audiostopothers: data.audiostopothers, /*isedit: data.isedit, */ audio_ytid: data.audio_ytid };

        if (isAdd) {
            $wrapper.addClass('sd-audio');
        }

        $wrapper.data(audioData);
        serializeDataByPrefix($wrapper, "audio");

        if (!dontLogInHistory) {
            EM_Editor.history.recordAction(isAdd ? audioUndoRedo : audioEditUndoRedo, { $wrapper: $wrapper.filter('.slide > .edit-wrapper'), audioData: audioData, prevData: prevData });
        }
        EM_Workspace.isDirty();
    }



    function removeAudio($wrapper, dontLogInHistory) {
        var data = $wrapper.data();
        audioData = { audiostop: data.audiostop, audioautoplay: data.audiostop, audiostarttime: data.audiostop, audiosrc: data.audiostop, audioloop: data.audiostop }

        $wrapper.removeClass('sd-audio');
        $wrapper.removeAttr('data-audiostop data-audioautoplay data-audiostarttime data-audiosrc data-audioloop');
        $wrapper.data({ audiostop: null, audioautoplay: null, audiostarttime: null, audiosrc: null, audioloop: null });

        if (!dontLogInHistory) {
            EM_Editor.history.recordAction(audioUndoRedo, { $wrapper: $($wrapper.filter('.slide > .edit-wrapper')), audioData: audioData });
        }
        EM_Workspace.isDirty();
    }

    function audioUndoRedo(data) {
        var $bothEditWrappers = EM_Workspace.withEditSurfaceWrapper(data.$wrapper);

        if (data.$wrapper.is('.sd-audio')) {
            removeAudio($bothEditWrappers, true);
        } else {
            $bothEditWrappers.data(data.audioData);
            serializeDataByPrefix($bothEditWrappers, "audio");
            $bothEditWrappers.addClass('sd-audio');
        }
    }
    function audioEditUndoRedo(data, isUndo) {
        var $bothEditWrappers = EM_Workspace.withEditSurfaceWrapper(data.$wrapper);

        $bothEditWrappers.data(isUndo ? data.prevData : data.audioData);
        serializeDataByPrefix($bothEditWrappers, "audio");
    }



    //#endregion

    function addAudioToJukebox(data, slideNum) {
        var urlParams = "", tStart, tEnd;

        try {


            tStart = data.audiostarttime ? getSecondsFromTimeSpan(data.audiostarttime) : false;
            tEnd = data.audiostoptime ? getSecondsFromTimeSpan(data.audiostoptime) : false;

            if (tStart || tEnd) {
                urlParams = "#t=" + (tStart ? tStart : 0) + (tEnd ? "," + tEnd : "");
            }

            $audio = $('<audio controls>').attr({ 'data-parent-uid': data.uid, 'data-audiostop': data.audiostop, 'data-slidenum': slideNum });
            $audio.data({ audiostop: data.audiostop, audioautoplay: data.audioautoplay, slidenum: slideNum });
            // $('<source>').attr('src', data.audiosrc.replace('https:', 'http:')).appendTo($audio);
            if (data.audioloop) {
                $audio.prop('loop', true);
                $audio.prop('loopStart', tStart);
                $audio.prop('loopEnd', tEnd);
            }

            $jukebox.append($audio);
            loadingTracker.increment();
            //console.log('audio elements loading: ', loadingTracker);

            $audio.one('abort canplaythrough', function () {
                loadingTracker.decrement();
            });

            if (data.audio_ytid) //re-fetch youtube link that may expire...
            {
                (function ($audio, urlParams) {
                    $.get("../editor/getYoutubeMP4", { videoID: data.audio_ytid }, function (data) {
                        if (data !== "ERROR") {
                            $audio.attr('src', data + urlParams);
                        } else {
                            $.post("../present/logError", { source: "emaze.audio.js/getYoutubeMP4", message: "user tried to use a copyright resticted video: " + data.audio_ytid });
                        }
                    });
                })($audio, urlParams);
            } else { // use exisitng src since no need to refresh the link
                $audio.attr('src', data.audiosrc + urlParams);
            }

        } catch (e) {
            $.post("../present/logError", { source: "emaze.audio.js/addAudioToJukebox", message: e.message });
        }

    }

    function addSlideAudioElementsToJukebox($slide) { //TODO: use setinterval here so that if there are many audio elements in one slide, it won't stall in chrome
        $slide.find('.sd-audio').each(function () {
            var $this = $(this);
            var data = $this.data();
            var index = $this.closest('.slide-wrapper').prevAll('.slide-wrapper').length;
            if (!$jukebox.children('[data-parent-uid="' + data.uid + '"]').length) { //if not already added
                addAudioToJukebox(data, index + 1); //+1 to match scene.currentslidenum;
            }
        });
    }


    function playAudio(audio, $editWrapper) {
        try {
            // audio.pause();//addeed ths hoping that it will help with setting current time

            //    audio.src = audio.src; //this sets start time to whatever its supposed to be in the case that its set in url or not. should also help to ensure that audio is availalble each time.

            //  if (startTime !== null && startTime !== undefined) {
            //      audio.currentTime = getSecondsFromTimeSpan(startTime);
            //  } else {
            //      audio.currentTime = 0;
            //  }
            //   audio.src = audio.src;
            audio.play();
            //  $editwRapper.addClass('sd-audio-play');

            if ($editWrapper.data().audiostopothers) { //stop all audio that is currently playing
                $jukebox.children().each(function () {
                    if (this !== audio && !this.paused && !this.ended) {
                        stopAudio(this, getEditWrapper(this));
                    }
                });
            }

        } catch (e) {
            console.log("audio play error", e);
        }

    }

    function stopAudio(audio, $editwRapper) {
        audio.pause();
        //audio.currentTime = 0;
        audio.src = audio.src; //this sets start time to whatever its supposed to be in the case that its set in url or not. should also help to ensure that audio is availalble each time.

        $editwRapper.removeClass('sd-audio-play');
    }

    function handleContextMenu(e) {
        var $wrapper = $(this), data = $wrapper.data(), $audio, audio;
        $audio = $jukebox.children('[data-parent-uid="' + data.uid + '"]');
        audio = $audio[0];
        if (!audio.paused) {
            stopAudio(audio, $wrapper);
        }
        e.preventDefault();
    }

    function handleAudioClick() {
        var $wrapper = $(this), data = $wrapper.data(), $audio, audio;
        $audio = $jukebox.children('[data-parent-uid="' + data.uid + '"]');
        audio = $audio[0];
        playAudio(audio, $wrapper);
    }
    //version with setting current time if user jumps forwards or back to where it would be during play mode.
    //function handleSlideChange(event, slideNum) {
    //    var currentSlideNum = scene.currentSlideNum();
    //    var stopDurationSum; //sum total of stop duration from audio element's parent slide to the currnet slide number;
    //    var isReverse = prevSlideNum > slideNum;
    //    var jumpedForwards = slideNum - prevSlideNum > 1;
    //    // if (!window.document.hasFocus()) {
    //   //     return;
    //   // }

    //    $jukebox.children('audio').each(function () {
    //        var $this = $(this),
    //            data = $this.data(),
    //            $wrapper = $('#scene [data-uid="' + data.parentUid + '"]'),
    //            isAudioStop = data['audiostop'] !== undefined && data['audiostop'] !== -1;

    //        // if it belongs to the current slide, autoplay if needed.
    //        if (data.audioautoplay === true && data.slidenum == slideNum) { 
    //                playAudio(this); //TODO: will need to set current time ot where its supposed to be
    //        }   //handle current slide, forwards, and backwards navigation
    //        else if (!this.paused && isAudioStop && (data.audiostop  < slideNum)) { //current slide audiostop is zero, so if its current slide it will allways be smaller than slide num and it will stop
    //            stopAudio(this, $wrapper);
    //        } else if (data.slidenum < slideNum && (!this.paused || data.audioautoplay === true) && (isReverse || jumpedForwards) && (!isAudioStop || data.audiostop > slideNum)) {
    //            //if its not playing but its autoplay = true from a  previous slide, and there is no audiostop, or it audiostop slide is greater tha current slide num, play the audio from the time that it would be at if the presentation was played sequentially.
    //            playAudio(this);
    //            stopDurationSum = data.audiostarttime ? getSecondsFromTimeSpan(data.audiostarttime) : 0 + stopDurations.slice(data.slidenum - 1, slideNum - 1).reduce(function (a, b) { return a + b });
    //            console.log(stopDurationSum);
    //            setTimeout(function (audio) {
    //                try {
    //                    audio.currentTime = stopDurationSum;
    //                } catch (e) {
    //                    console.log(e);
    //                }
    //            }, 100, this);
    //        }
    //        $wrapper.toggleClass('sd-audio-play', !this.paused);
    //    });
    //    prevSlideNum = slideNum;
    //}

    function handleSlideChange(event, slideNum) {
        var currentSlideNum = scene.currentSlideNum();

        $jukebox.children('audio').each(function () {
            var $this = $(this),
                data = $this.data(),
                $wrapper = $('#scene [data-uid="' + data.parentUid + '"]');

            // if it belongs to the current slide, autoplay if needed.
            if (data.audioautoplay === true && this.paused && data.slidenum == slideNum) {
                playAudio(this, $wrapper);
            }   //handle current slide, forwards, and backwards navigation
            else if (!this.paused && data['audiostop'] !== undefined && data['audiostop'] !== -1 && (data.audiostop === 0 || data.audiostop < slideNum || slideNum < currentSlideNum)) {
                stopAudio(this, $wrapper);
            }
            $wrapper.toggleClass('sd-audio-play', !this.paused);
        });
    }

    function reset(slideDeck) {
        $jukebox.html('');
        loadAllAudioFromSlideDeck(slideDeck);
    }

    function stopAllAudio() {
        $('audio , video').each(function () { this.pause() });
    }


    function getSecondsFromTimeSpan(str) {
        var p, s, m;
        try {

            if (!str) {
                return 0;
            }
            p = str.split(':');
            s = 0;
            m = 1;

            while (p.length > 0) {
                s += m * parseInt(p.pop(), 10);
                m *= 60;
            }
            return s;

        } catch (e) {
            $.post("../present/logError", { source: "emaze.audio.js/getSecondsFromTimeSpan", message: e.message + " str: " + str });
            return 0;
        }
    }

    function debugInEditor() {
        $('#edit-surface').on('click', '.sd-audio', handleAudioClick);
        $("#scene").on('transitionStart', handleSlideChange);

    }
    //#endregion
    return {
        init: init,
        reset: reset,
        handleSlideChange: handleSlideChange,
        stopAllAudio: stopAllAudio,
        loadingTracker: loadingTracker,
        updateAudioElement: updateAudioElement,
        toggleEnabled: toggleEnabled,
        updateAudioSrc: updateAudioSrc
    }

})();


//function dk() {

//    $('#jukebox').css({
//        position: 'absolute',
//        'z-index': '100',
//        top: '100px',
//        left: '400px'
//    }).children('audio').prop('controls', true);
//}









