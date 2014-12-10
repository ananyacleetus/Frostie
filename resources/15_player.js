
EM.player = (function($){

    // Globals
    var isStatic = $('html').data('static') === "undefined",
        firstLoad = true,//inidicate if player loaded already or not
        presentSlideNumber = setSlideNumberFromURL(),//Set hash value if exists as slide num, 1 if not
        sectionsSize = 0,//total number of sections - set in sceneIsReady()
        slidesSize = 0,//total number of slides - set in sceneIsReady()
        slidedeck = null,//slidedeck object, init when scene is ready
        $currentSlide = null,
        isAutoplay = false,//permission to autoplay
        isPlaying = false,//show if autoplay active,
        isAutoplayButtonClicked = false,
        defaultStopDuration = 4,//default duration in autoplay
        isFullscreen = false,
        showingSections = false,//does the sections screen showing
        hash = window.location.hash,//keep hash parameters
        timeout = null,//GUI hide timeout
        logoTimeout = null,//Logo hide timeout
        isReload = false,//Are we in reload process
        isSharePopUpShowing = false,//Does the social share pop up showing
        isDownload = $('html').data('download') === "True", //Are we in offline mode
        isEditor = false,//Does the player loaded in editor
        limitShowInDesktop = false;


    /*** Public methods***/

    // initilize player
    function init ( id ){

        //TEMP POC BY ASAF

        $(document.body).on('click', '.sd-form-btn', function () {
            var $slide, email, content= '';

            $slide =  $(this).closest('.slide');

            $slide.find('.sd-form-value').each(function () {
                content += (this.value || '').trim() + '\n';
            })

            email = ($slide.find('.sd-form-email').text() || '').trim();

            $.post('/Forms/SendEmail', { email: email, content: content }, function (data) {
                console.log(data);
            });

        });

        //EDN TEMP POC

        try {
            isEditor = (window.parent.location.href.indexOf('editor') != -1) ? true : false;
        } catch(e){
        }

        // Set enable for auto play for media elements
        EM.Media.toggleEnabled( true );

        /*** Set listeners ***/
        $(window).on('presentationObjectReady', setPlayerSidebarButtons);
        $(window).on('presentationObjectReady', setPlayerGUIbyDevice);

        // scene-manager is done and the scene is ready to be played
        $(window).on('sceneReady', sceneIsReady);

        if (isEditor) {
            
            $(window).one('sceneReady', function () {
                try {
                        window.parent.postMessage('playerReady', '*');
                } catch (e) {
                    console.log(e);
                    //TODO send error to logger in server;
                }
            });
        }

        // perform action when hash changes
        $(window).on('hashchange', stateCalled);

        // Implement slide settings if exist on $currentSlide
        $('#scene').on('transitionStart', checkSlideAutoplay);
        $('#scene').on('transitionDone', checkSlideScroll);

        // Player control
        $('.playButton').on('click', playWrap);
        $('.leftButton').on('click', prev);
        $('.rightButton').on('click', next);
        $('.voiceButton').on('click', voiceControl);
        $('.sectionsButton').on('click', sectionsScreen);
        $('.fullscreenButton').on('click', fullScreen);

        // Share popup
        $('.replay').on('click', rewind);

        // Set keyboard control listener
        $(window).on('keydown', onKeyPress);

        // Init the Scene
        EM.scenemanager.init( id );
    }

    // Go to a specific slide number
    function go ( targetSlideNumber ) {
        presentSlideNumber = targetSlideNumber;
        updateState();
    }


    // Letting us know if autoplay intiated alone or by user action
    function playWrap () {
        ( isAutoplayButtonClicked && isAutoplay) ? isAutoplayButtonClicked = false : isAutoplayButtonClicked = true;
        play();
    }

    // Autoplay presentation
    function play () {
        if ( isAutoplay ){
            isAutoplay = false;
            stopAutoplay();
            $('.pauseButton').removeClass('pauseButton').addClass('playButton');
        } else {
            isAutoplay = true;
            startAutoplay();
            $('.playButton').removeClass('playButton').addClass('pauseButton');
        }

    }

    // Go to the next slide
    function next () {
        // Don't exceed total number of slides
        if ( presentSlideNumber + 1 > slidesSize ) {
            // Report end of presentation to who's interested
            try {
                window.parent.postMessage('presentationEnded', '*');
            } catch (e) {
                console.log(e);
                //TODO send error to logger in server;
            }

            // show the share pop up only if user triggered next
            if ( !isAutoplay ) showSharePopUp();
            
            presentSlideNumber = slidesSize;
        } else {
            presentSlideNumber++;
        }

        updateState();

    }
    
    // Go to the previous slide
    function prev () {
        
        if ( isSharePopUpShowing ){
            hideSharePopUp();
            return;
        }

        // Limit slide number to 1
        if ( presentSlideNumber - 1 < 1 ) {
            presentSlideNumber = 1;
        } else {
            presentSlideNumber--;
        }

        updateState();

    }

    // Register voice commands and trigger voice control on/off
    function voiceControl(){
        if (annyang) {
            // Commands action
            var commands = {
                'next': function () {
                    next();
                },
                'back': function () {
                    prev();
                },
                'agenda': function () {
                    sectionsScreen();
                },
                'slide': function () {
                    sectionsDisplaySlides();
                },
                'close': function () {
                    hideSectionsFrame();
                },
                'play': function () {
                    play();
                },
                'stop': function () {
                    play();
                },
                'amaze': function () {//emaze parsed to amaze/amazed usually
                    play();
                    hideGUI();
                },
                'amazed': function () {//emaze parsed to amaze/amazed usually
                    play();
                    hideGUI();
                }

            };

            // Initialize annyang with the commands
            annyang.init(commands);
            
            // Make sure commands were added, might be issue with init this ver
            annyang.addCommands(commands);

            var $status = $('.voiceButton').attr('data-listen');

            if ( $status === "false" ){
                // Start listening.
                annyang.start({ autoRestart: false });
                $('.voiceButton').attr('data-listen', 'true');
                $('.voiceButton').addClass('buttonVoiceOn').addClass('voice-active');

                annyang.addCallback('end', function () {
                    annyang.abort();
                    $('.voiceButton').attr('data-listen', 'false'); 
                    $('.voiceButton').removeClass('buttonVoiceOn').removeClass('voice-active');
                });
            } else {
                annyang.abort();
                $('.voiceButton').attr('data-listen', 'false'); 
                $('.voiceButton').removeClass('buttonVoiceOn').removeClass('voice-active');
            }
        }
    }

    // Triggers sections screen, "Agenda"
    function sectionsScreen() {
        if ( isAutoplay ){
            play();//Stop autoplay if active
        }
        
        if ( !showingSections ){
            $("#sectionsFrame").css("visibility", "visible");
            showingSections = true;
        } else{
            $("#sectionsFrame").css("visibility", "hidden");
            showingSections = false;
        }
        
    }

    // Turn on/off fullscreen mode
    function fullScreen () {
        if ( !isFullscreen ){
            requestFullScreen( document.body );
            isFullscreen = true;
            $('.fullscreenButton').addClass('fullscreen-active');
            if (window.parent.$zoho){
                window.parent.$zoho.salesiq.floatbutton.visible("hide");
            }
        } else {
            cancelFullScreen( document.body );
            isFullscreen = false;
            $('.fullscreenButton').removeClass('fullscreen-active');
            if (window.parent.$zoho){
                window.parent.$zoho.salesiq.floatbutton.visible("show");
            }
        }

    }

    // TODO: Check if we use this method
    function rewind() {
        if ( presentSlideNumber == 1 ){
            hideSharePopUp();
        }

        window.scene.rewind();
        presentSlideNumber = 1;
        updateState();
    }

    /*** Private methods ***/

    // handles sceneReady event, revealing the presentation
    // and making adjustments
    function sceneIsReady(){
        // Update Globals
        if ( EM.compatibility.getBrowser().indexOf('ie') != -1 && isDownload){
            sectionsSize = +$.cookie('totalSections');
            slidesSize = +$.cookie('totalSlides');
        } else {
            sectionsSize = +localStorage.getItem('totalSections');
            slidesSize = +localStorage.getItem('totalSlides');
        }
        
        
        // Update global slidedeck from returned object.
        // On reload editor sends us the slidedeck via client side
        if ( !isReload ){
            slidedeck = EM_slideDeck.getSLideDeckFromString($('#slidedeck> xmp').html() || EM.scenemanager.presentation.theme.slides);
        }

        username = EM.scenemanager.presentation.userInfo.userName;
        isPremium = EM.scenemanager.presentation.userInfo.isPremiumUser;
        isLoggedIn = EM.scenemanager.presentation.userInfo.isUserLoggedIn;
        
        // Display presentation info
        setPresentationInfo();

        // Init audio module with presentation slidedeck
        EM.Audio.init( slidedeck );

        if ( isReload ){
            // Reset audio module
            EM.Audio.reset( slidedeck );
        }

        // Go to the requested slide (or first one if none mentioned)
        go( presentSlideNumber );

        buildSectionsScreen();

        // Use scene scaling for now
        setTimeout(function(){
            window.scene.resizeWinner();
        }, 600);
        
        // Don't display the menu since functionality not available offline
        if ( isDownload ) $('#menu-container').addClass('hidden');

        $('html').on("mouseenter", showGUI);
        $('html').on("mouseleave", hideGUI);

        // Trigger GUI once if mouse moved
        $('#scene').on('mousemove', mouseMoveGUIHandler );

        if ( EM.compatibility.getDevice() != "desktop" || window.location.href.indexOf('enabletouch') > 0 ){
            // we are on tablet or mobile or any other touch
            // supported device
            $('html').hammer().on("tap swipeup", showGUI);
            $('html').hammer().on("swipedown", hideGUI);
            $('html').hammer().on("swiperight", prev);
            $('html').hammer().on("swipeleft", next);
        }

        // all should be set, we can remove the loader
        removeLoader();

        //Remove loader from my-presentations/explore/shared player iframe
        try {
            if (window.top && (window.self !== window.top) && window.parent.playerReady) {
                window.parent.playerReady();
            }
        } catch (err) {
            console.error(err);
        }

        // After scene is ready we can surely say player is also ready
        firstLoad = false;
        
        // Trigger any existing paramerters actions
        triggerParamsActions();

        showGUI();

        if ( isReload && isEditor ){
            isReload = false;
            try {
                setTimeout(function(){
                    window.parent.postMessage('playerReloaded', '*');    
                }, 300);
            } catch (e) {
                console.log(e);
                //TODO send error to logger in server;
            }
        }

        setPlayerCookies();

    }

    // First run, setting of player elements according to given user permissions
    function setPlayerSidebarButtons () {
        var permissions = EM.scenemanager.presentation.userInfo;

        // Should logo be displayed
        ( permissions.showLogo ) ? $('#player-logo img').removeClass('hidden') : $('#player-logo img').addClass('hidden');

        // Is user allowed to edit
        if ( permissions.isUserLoggedIn && !isEditor){
            if ( permissions.canEdit ) {
                $('#edit-button');
            } else {
                $('#edit-button').off('click');
                $('#edit-button').attr('id', 'clone-button');
            }
        } else {
            $('#edit-button').addClass('hidden');
        }

        // Is user allowed to duplicated
        if ( permissions.canDuplicate ) {
            $('#duplicate-button').removeClass('hidden');
        } else {
            $('#duplicate-button').add('#clone-button').addClass('hidden');
        }

        // Is user allowed to delete
        ( permissions.isUserOwner && !isEditor) ? $('#delete-button').removeClass('hidden') : $('#delete-button').addClass('hidden');

        // Is user allowed to download
        ( permissions.canDownload ) ? $('#download-button').removeClass('hidden') : $('#download-button').addClass('hidden');

        // Is user allowed to print
        ( permissions.canPrint ) ? $('#print-button').removeClass('hidden') : $('#print-button').addClass('hidden');

    }

    // Set CSS to according to device
    function setPlayerGUIbyDevice () {
        var device = EM.compatibility.getDevice();

        switch( device ){
            case 'tablet':
                var src = $('.device').attr('href');
                src = src.replace('desktop', 'tablet');

                $('.device').attr('href', src);
            break;
            case 'mobile':
                var src = $('.device').attr('href');
                src = src.replace('desktop', 'mobile');

                $('.device').attr('href', src);
            break;
        }
    }

    // Set control panel slider
    function playerSlider(){

        $("#slider").slider({
            min: 1,
            max: slidesSize,
            value: presentSlideNumber,
            slide: function( event, ui ) {
              go( ui.value );
            }
        });

        if ( firstLoad || isReload){
            setSliderMarks();
        }

        // Calculate and prepare preview thumbnail with slide
        $('.ui-state-default').on('mouseover', previewPosition);
        // Display the preview thumbnail
        $('.ui-state-default').hover(function() {
            $('.preview').fadeIn(150);
        }, function() {
            $('.preview').fadeOut(150);
        });
    }

    // Update hash with current slide number
    function updateState(){
        // If we already have hash on URL it won't trigger hash change
        // So I force a hash change
        if ( firstLoad && hash || isReload){
            window.location.hash = '#';
        }        

        window.location.hash = '#' + presentSlideNumber;
        updateCurrentSlide();
    }

    // trigger by hashchange event
    function stateCalled(e){
        hideSharePopUp();

        // update current slide number with history state slide number value
        presentSlideNumber = setSlideNumberFromURL();

        // using scene go slide since we update state in our go method
        window.scene.goSlide( presentSlideNumber );

        updateState();
        updateGUI();
    }

    // Start and recurse autoplay
    function startAutoplay () {
        // Recurse on transitionDone
        $("#scene").one('transitionDone', startAutoplay);

        // Set stop duration time according to slide settings or default one
        var seconds = getSlideSettingValue( presentSlideNumber, 'stopduration') || defaultStopDuration;
        
        if (isPlaying !== false) {
            clearTimeout(isPlaying);
        }

        // Perform transition
        isPlaying = setTimeout( autoplay, seconds * 1000 );

    }

    // Perform autoplay transition
    function autoplay () {

        if (!isAutoplay) { return; }

        // Remove playing embedded videos during play
        EM_YoutubePlayer.removeVideoPlayer();

        ( presentSlideNumber >= slidesSize ) ? go(1) : next();
        
        if ( presentSlideNumber >= slidesSize ) {
            // Report end of presentation to who's interested
            try {
                // Get slide duration and reduce a bit to prevent last slide transition start
                var sec = (getSlideSettingValue( presentSlideNumber, 'stopduration') || defaultStopDuration) - 0.3;

                $('#scene').one('transitionDone', function(){
                    setTimeout(function(){
                        window.parent.postMessage('presentationEnded', '*');    
                    }, sec * 1000);
                });
            } catch (e) {
                console.log(e);
                //TODO send error to logger in server;
            }
        }
    }

    // Stop the autoplay
    function stopAutoplay () {
        if (isPlaying !== false) {
            clearTimeout(isPlaying);
        }

    }

    // Set fullscreen with fallback to OLD IE (version 9) using activeX if enabled
    function requestFullScreen(element) {
        // Supports most browsers and their versions.
        var requestMethod = element.requestFullScreen || 
                            element.webkitRequestFullScreen || 
                            element.mozRequestFullScreen || 
                            element.msRequestFullScreen;

        if (requestMethod) { // Native full screen.
            requestMethod.call(element);
        } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.

            var wscript = new ActiveXObject("WScript.Shell");
            
            if (wscript !== null) {
                wscript.SendKeys("{F11}");
            }

        } else { //ActiveX disabled, let's open new window set to fullscreen

            if ( localStorage.getItem('iefs') === "false" || localStorage.getItem('iefs') == null ){
                window.open( window.location.href, 'emaze Fullscreen', 'fullscreen=yes' );
                localStorage.setItem('iefs', true);
            }
        }
    }

    // If fullscreen is active, disable it
    function cancelFullScreen () {
        if(document.exitFullscreen) {
            document.exitFullscreen();
        } else if(document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if(document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (localStorage.getItem('iefs') === "true"){//the infamous IE handling
            localStorage.setItem('iefs', false);
            window.close();
        }
    }

    //Get settings object of a requested slide
    function getSlideSettings(slideNum) {
        try {
            return slidedeck.slideSettings[slideNum - 1] || {};
        } catch (e) {
            return {};
        }
    }
    
    // Get specific value from settings object of a requested slide
    function getSlideSettingValue(slideNum, key) {
        var slideSettings = getSlideSettings(slideNum);
        if (slideSettings[key]) {
            return slideSettings[key];
        } else {
            return null;
        }
    }

    // Triggers autoplay if slide has autoplay setting
    function checkSlideAutoplay(event, slideNum) {
        var settings = getSlideSettings(slideNum);
        
        // If we are not in autoplay mode and slide settings want to, toggle autoplay on
        if ( !isAutoplay ){
            if ( settings['autoplay'] ) { 
                play();
            }
        }

        // If we are in autoplay mode and slide settings don't want to, toggle autoplay off
        if ( isAutoplay ){
            if ( !settings['autoplay'] && !isAutoplayButtonClicked){
                play();
            }
        }

    }

    // Toggle scroll if slide has scroll setting set to true
    function checkSlideScroll(event, slideNum) {
        var settings = getSlideSettings( presentSlideNumber );

        updateCurrentSlide();

        if ($currentSlide) {
            if (!settings.scroll) {
                $('.scroll-enabled').removeClass('scroll-enabled');
                EM.slideOptions.toggleHorizontalScroll(false, $('.current-active-slide'));
            } else {
                $currentSlide.addClass('scroll-enabled');
                EM.slideOptions.toggleHorizontalScroll(true, $('.current-active-slide'));
            }
        }

        // Reset offset values if we scrolled before
        // $('.current-active-slide').scrollTop(0).scrollLeft(0);

    }

    // Reload the player to synch with editor
    function reload(slideDeck, slideNum, themeUrl) {
        try{
            // Let the player know we are entering reload process
            isReload = true;

            changeTheme(themeUrl);

            // Set present slide number to the requested slide number
            presentSlideNumber = slideNum;

            slidedeck = slideDeck;//update the global slidedeck with updated one given by editor

            // Hide sections screen in case it was opened
            hideSectionsFrame();

            // Clear the slider marks since slide deck size could be changed
            clearSliderMarks();

            // Reload #scene and it's related assets
            EM.scenemanager.reload( slidedeck );

            // Disalbe auto play in player from editor in case of autoplay active
            if ( isAutoplay ){
                play();
            }

        } catch(e){
            console.log(e.message)
            $.post("/present/logError", { source: "player.js/relaod", message: e.message });
        }

    }

    //change the theme css file in order to sync with change in editor
    function changeTheme(url) {
        EM.scenemanager.clearTheme();
        EM.scenemanager.setTheme(url);
    }

    // Bind keyboard keys to their coorsponding actions
    function onKeyPress (e) {

        var code = e.keyCode;

        switch (code){
            
            case 35: //End
                go( slidesSize );
            break;
            
            case 36: //Home
                rewind();
            break;

            case 37://Left Arrow
            case 33://PageUp
            case 37://Backspace
                e.preventDefault();
                prev();
            break;

            case 39://Right Arrow
            case 34://PageDown
            case 32://Space bar
                e.preventDefault();
                next();
            break;

            case 13://Return
                fullScreen();
            break;
            case 122://F11
                e.preventDefault();
                fullScreen();
            break;

        }
    }

    // Show the share pop up screen
    function showSharePopUp () {

        // Trigger share pop up since we were in last slide
        if ( !isSharePopUpShowing && EM.scenemanager.presentation.userInfo.isPublic ){
            $('.pop-container').show();
            isSharePopUpShowing = true;

            $('.rightButton').prop('disabled', true);
            $('.leftButton').prop('disabled', false);

            var scale_factor = $('#slide-box').attr('scale-factor') || ( $(window).width() / 1920);

            $('.wrap-pop').css('-webkit-transform', 'scale(' + scale_factor + ')');
            $('.wrap-pop').css('-moz-transform', 'scale(' + scale_factor + ')');
            $('.wrap-pop').css('-ms-transform', 'scale(' + scale_factor + ')');
            $('.wrap-pop').css('transform', 'scale(' + scale_factor + ')');
        }
    }

    // Hide the share pop up screen
    function hideSharePopUp () {
        if ( isSharePopUpShowing ){
            $('.pop-container').hide();
            isSharePopUpShowing = false;
            $('.rightButton').prop('disabled', false);

            // Disable previous functionality since we have only 1 slide
            if ( slidesSize == 1 ){
                $('.leftButton').prop('disabled', true);
            }
        }
    }

    // Popping up the share option selected and set it
    function sharePopup(width, height, net, sharefrom) {
        var leftPosition, topPosition;
        leftPosition = (window.screen.width / 2) - ((width / 2) + 10);
        topPosition = (window.screen.height / 2) - ((height / 2) + 50);

        var windowFeatures = "status=no,height=" + height + ",width=" + width + ",resizable=yes,left=" + leftPosition + ",top=" + topPosition + ",screenX=" + leftPosition + ",screenY=" + topPosition + ",toolbar=no,menubar=no,scrollbars=no,location=no,directories=no";
        u = location.href;
        t = document.title;

        url = u.substring(0, u.indexOf('#'));

        switch(net){
            case 'fb':
                share = "http://www.facebook.com/sharer.php?u=";
                ga('send', 'event', 'Player', 'LastSlide-facebook', username + ', ' + presentationId);
                break;
            case 'tw':
                share = "https://twitter.com/share?text=Check out this emazing presentation&via=emaze_tweets&url=";
                ga('send', 'event', 'Player', 'LastSlide-twitter', username + ', ' + presentationId);
                break;
            case 'in':
                share = 'http://www.linkedin.com/shareArticle?mini=true&title=' + EM.scenemanager.presentation.core.name + '&summary=' + EM.scenemanager.presentation.core.description + '&source=emaze&url=';
                ga('send', 'event', 'Player', 'LastSlide-linkedin', username + ', ' + presentationId);
                break;
            case 'gp':
                share = "https://plus.google.com/share?url=";
                ga('send', 'event', 'Player', 'LastSlide-googleplus', username + ', ' + presentationId);
                break;
        }

        $.ajax({
            type: 'POST', url: '/NewShare/sendEvent', dataType: 'json',
            data: { presid: presentationId, sharefrom: ((sharefrom=='Player') ? 'lastslide' : sharefrom), sharetype: net }
        });

        window.open(share + encodeURIComponent(url) + '&t=' + encodeURIComponent(t),'sharer', windowFeatures);
        return false;
    }

    /*** Utilities ***/

    // return slide number (as integer)
    function setSlideNumberFromURL () {

        var hash = window.location.hash,
            slideNumber;

        hash = hash.substr(1);//trim out the #

        // Slidenumber backwards compatibility
        if ( /slidenum=/i.test(hash) ){
            hash = hash.replace('slidenum=', '');
        }

        // check for that prev, next, last, first in the hash
        if ( isNaN( +hash ) ){
            switch ( hash ) {
                case 'prev':
                    slideNumber = presentSlideNumber - 1;
                    break;
                case 'next':
                    slideNumber = presentSlideNumber + 1;
                    break;
                case 'first':
                    slideNumber = 1;
                    break;
                case 'last':
                    slideNumber = slidesSize;
                    break;
            }

        } else {
            slideNumber = hash ? +hash : 1;
        }

        // smaller then 1
        if ( slideNumber < 1 ){
            slideNumber = 1;
        }

        // larger then total number of slides
        if ( slideNumber > slidesSize ){
            slideNumber = slidesSize;
        }

        // unknown value of hash
        if ( isNaN(slideNumber) ){
            if ( $('a[href="#' + hash + '"]').length > 0 ){
                slideNumber = hash;
            } else {
                slideNumber = 1;
            }
        }

        return slideNumber;

    }

    // remove player loader when scene is ready
    function removeLoader () {
        $('#player-loader').fadeOut(600, function(){
            $(this).addClass('hidden');
        });
    }

    // Update the $currentSlide global var and mark current slide with a class
    function updateCurrentSlide () {
        // Update current Slide
        $currentSlide = $( window.scene.getCurrentSlide() );

        // Generic scene handle it's own current-active-slide
        if ( $currentSlide.length > 0){
            if( !$currentSlide.hasClass('slide_g') ){
                // Update current-active-slide class on requried slide
                $('.current-active-slide').removeClass('current-active-slide');
                $currentSlide.addClass('current-active-slide');
            }
            
        }

        playerSlider();

    }

    // Updating the player GUI during presentation run
    function updateGUI () {
        // First slide
        if ( presentSlideNumber == 1 ){
            $('.leftButton').prop('disabled', true);

            // We are somewhere in the middle
        } else if ( presentSlideNumber > 1 && presentSlideNumber < slidesSize  ){
            $('.leftButton').add('.rightButton').prop('disabled', false);

            // Last slide
        } else if ( presentSlideNumber == slidesSize ){
            // We have more then one slide, so we can go back to one
            // and move forward to pop sharing div
            $('.leftButton').add('.rightButton').prop('disabled', false);

            // We shouldn't get here, but if we do enable control
        } else {
            $('.leftButton').add('.rightButton').prop('disabled', false);
        }

    }

    // Setting the presentation scale marks on the GUI slider
    function setSliderMarks () {
        var $slider = $('#slider'),
            step = 100 / (slidesSize - 1),//Steps for mark positioning
            position = 0,//current mark position
            isSection = false;// Mark to add next mark as a section mark

        for (i = 0; i < sectionsSize; i++) {
            var sections = slidedeck.sections[i];
            
            isSection = true;

            for (var j = 0; j < sections.slides.length; j++) {
                // Add regular slide mark
                
                if ( isSection ){
                    $slider.append('<a href="#" class="ui-slider-mark-section ui-state-default ui-corner-all" style="left:' + position + '%;"></a>');
                } else{
                    $slider.append('<a href="#" class="ui-slider-mark ui-state-default ui-corner-all" style="left:' + position + '%;"></a>');    
                }
                
                position += step;
                isSection = false;
            }
        }

    }

    function clearSliderMarks () {
        $('.ui-slider-mark').remove();
    }

    // Create the Sections screen (agenda)
    function buildSectionsScreen() {
        var WIDTH = 1920;
        var SCALED = 185 / WIDTH;
        var HEIGHT = 1080;

        $("#agendaButton").css("background", "#515151");
        $("#slidesButton").css("background", "#ee4c4e");

        if ( slidedeck ) {
            $("#sectionsTitle").html( EM.scenemanager.presentation.core.name );
            var $sectionList = $("#sectionList");
            $sectionList.empty();
            var counter = 0;
            var sCounter = 0; //Sections counter

            for (var i = 0; i < slidedeck.sections.length; i++) {
                var section = slidedeck.sections[i];
                var aSection = '<div id="section_' + (i + 1) + '" data-slide="' + (sCounter + 1) + '" class="sectionsSlidesSectionNames">\n' + section.title + '</div>';
                
                $sectionList.append(aSection);

                sCounter += section.slides.length;
                $("#section_" + (i + 1)).click(function () {
                    hideSectionsFrame();
                    go( +this.getAttribute("data-slide") );
                });

                $sectionList.append("<div id='dummy_" + (i + 1) + "' class='agenda-slides-wrapper'></div><div class='clearfix' style='height: 15px;'></div>");
                
                var $section = $("#dummy_" + (i + 1));

                for (var j = 0; j < counter; j++) {
                    $section.append("<div class='slide-wrapper' style='display:none'></div>");
                }

                for (var s = 0; s < section.slides.length; s++) {
                    counter++;
                    var aSlide = '<div id="slider_' + (counter) + '" data-slide="' + (counter) + '" class="aSectionSlide slide-wrapper">\n' +
                             '</div>';
                    $section.append(aSlide);
                    var $slideFrame = $('#slider_' + (counter));
                    $slideFrame.append(section.slides[s]);
                    var $theSlide = $slideFrame.children(":first");

                    toggleTransformOnSlideElements( $theSlide );

                    $theSlide.css('width', '' + WIDTH + 'px');
                    $theSlide.css('height', '' + HEIGHT + 'px');
                    $theSlide.css('-webkit-transform-origin', '0 0 0');
                    $theSlide.css('-moz-transform-origin', '0 0 0');
                    $theSlide.css('-ms-transform-origin', '0 0 0');
                    $theSlide.css('transform-origin', '0 0 0');
                    $theSlide.css('-webkit-transform', 'scale(' + SCALED + ')');
                    $theSlide.css('-moz-transform', 'scale(' + SCALED + ')');
                    $theSlide.css('-ms-transform', 'scale(' + SCALED + ')');
                    $theSlide.css('transform', 'scale(' + SCALED + ')');

                    $slideFrame.click(function () {
                        hideSectionsFrame();
                        go( +this.getAttribute("data-slide") );
                    });

                    $('#sectionsClose').click(function () {
                        hideSectionsFrame();
                    });
                }
            }
        }
    }

    // Hide the sections frame
    function hideSectionsFrame() {
        $("#sectionsFrame").css("visibility", "hidden");
        showingSections = false;
    }

    // Helper method for scaling slide elements
    function toggleTransformOnSlideElements($container, toggle) {
        if ($container && $container.length) {
            var $elements = $container.find('[data-transform]');
            
            if (toggle) {
                $elements.each(function () {
                    var transformVal = $(this).attr('data-transform');
                    var $this = $(this);
                    var trnsformStr = ['transform:', transformVal, '; -webkit-transform:', transformVal, '; -moz-transform:', transformVal, '; -ms-transform:', transformVal].join('');
                    $this.css('transform', '');
                    var styleAttr = $this.attr('style') || '';
                    $this.attr('style', styleAttr.concat(trnsformStr));
                });

            } else {
                $elements.css({ 
                    'transform': 'none',
                    '-webkit-transform': 'none',
                    '-moz-transform': 'none',
                    '-ms-transform': 'none' 
                });
            }
        }
    }

    // Show the GUI and hide presentation information & logo after 3 seconds
    function showGUI (e) {
        
        clearTimeout(logoTimeout);

        // Hide logo and info after 3s
        logoTimeout = setTimeout(function(){
            $('#player-logo')
            .add('#presentation-info').removeClass('show')
        }, 5000);

        if ( EM.compatibility.getDevice() === "tablet" ){
            $('#buttonsPanel')
            .add('#player-logo')
            .add('#presentation-info')
            .add('.leftButton')
            .add('.rightButton')
            .add('#menu-container').addClass('show tablet');

            $('#timelinebutton').addClass('show hometablet');

        } else {
            $('#buttonsPanel')
            .add('.leftButton')
            .add('.rightButton')
            .add('#menu-container')
            .add('#timelinebutton')
            .add('#player-logo')
            .add('#presentation-info').addClass('show');

            // Click is triggering tap, and we want to disable logo and info
            // visibility to once, so it won't trigger on clicks
            if ( !limitShowInDesktop ){
                $('#player-logo').add('#presentation-info').addClass('show');
                limitShowInDesktop = true;
            }
        }

    }

    // Hide GUI
    function hideGUI () {
        $('#buttonsPanel')
        .add('#player-logo')
        .add('#presentation-info')
        .add('.leftButton')
        .add('.rightButton')
        .add('#menu-container')
        .add('#timelinebutton').removeClass('show');

        clearTimeout(timeout);
    }

    // Hide GUI and never show it again
    function hideGUIForever () {
        $('#buttonsPanel')
        .add('.leftButton')
        .add('.rightButton')
        .add('#timelinebutton').removeClass('show').addClass('hidden');
    }

    // Hide player controls
    function hideControls () {
        $('#buttonsPanel')
        .add('.leftButton')
        .add('.rightButton')
        .add('#timelinebutton').removeClass('show').addClass('hidden');
    }

    // Hide top right menu
    function hideMenu () {
        $('#menu-container').removeClass('show').addClass('hidden');
    }
    
    // Handle GUI apperance when mouse move
    // GUI will be hidden after 3 seconds
    function mouseMoveGUIHandler (e) {
        $('#buttonsPanel')
        .add('.leftButton')
        .add('.rightButton')
        .add('#menu-container')
        .add('#timelinebutton').addClass('show');

        resetTimer();
    }

    function resetTimer () {
        clearTimeout(timeout);
        timeout = setTimeout( hideOnTimeExpire ,2000);

    }

    function hideOnTimeExpire () {
        // If user interact with any of player controls, reset timeout timer
        if ( $('.player-button:hover').length > 0 
            || $('#buttonsPanel:hover').length > 0 
            || $('.ui-state-default:hover').length > 0
            || $('.rightButton:hover').length > 0
            || $('.leftButton:hover').length > 0
            || $('#menu-container:hover').length > 0 ){

            resetTimer();
        } else {
            hideGUI();
        }
        
    }

    // TODO: make more organized with seperate function
    $('#slider').slider().mousemove(function(e) {
        var width = $(this).width(),
            offset = $(this).offset(),
            options = $(this).slider('option'),
            value = Math.round(((e.clientX - offset.left) / width) * (options.max - options.min)) + options.min;
        
        $('.the-content').empty();

        setPreviewContentByPosition( value - 1 );

    });

    // Position the preview thumbnail above hovered tick mark
    function previewPosition (e) {
        // get tick position in slider
        var position = $(this).position().left;
        // get tic offset from the left of the player
        var offset = $(this).offset().left;
        // if the oofset biger then half of the preview div
        if( offset > 150 ) {
            $('.preview').css('left', position - 150 );
            $('.chupchik').css('left', '50%' );
        } else {
            $('.preview').css('left', - ($('#slider').position().left) + 4 );
            // if the current slide circle on the tick
            if ( $(this).hasClass('ui-slider-handle') ) {
                $('.chupchik').css('left', offset - 1);
            } else {
                $('.chupchik').css('left', offset - 5);
            }
        }    
 
    }

    // Set scaled slide in the preview thumb when hovering slider tick mark
    function setPreviewContentByPosition (pos) {
        var slide = EM.scenemanager.getSlideByPosition( pos );

        
        $('.preview > .slide-wrapper:not(.the-content)').remove();

        for (var i = 0; i < pos; i++) {
            $('.preview').prepend('<div class="slide-wrapper"></div>');
        };

        $('.the-content').addClass('slide-wrapper');


        $(slide).appendTo('.the-content');

        $('.the-content > .slide').css({
            '-moz-transform-origin': '0 0',                
            'transform-origin':'0 0',                   
            '-ms-transform-origin':'0 0',                                
            '-webkit-transform-origin':'0 0'
        });

        scaleElement( $('.the-content > .slide'), $('.the-content'), 0 );

        $('.section-name').text( EM.scenemanager.getSectionNameBySlide(pos) );
        $('.slide-number').text( (pos + 1) + '/' + slidesSize );
    }

    // Scale element and return it's scale factor
    function scaleElement($element, $context, margin) {
        margin = margin || 0;
        var
            w = $element.width(),
            h = $element.height(),
            dw = $context.width() - margin,
            dh = $context.height() - margin,
            widthDelta,
            heightDetla,
            minDelta,
            maxDelta,
            transform;

        widthDelta = dw / w;
        heightDetla = dh / h;
        minDelta = Math.min(widthDelta, heightDetla);

        transform = 'scale(' + minDelta + ',' + minDelta + ')';

        $element.css('-webkit-transform', transform).attr('scale-factor', minDelta);
        $element.css('-moz-transform', transform).attr('scale-factor', minDelta);
        $element.css('-ms-transform', transform).attr('scale-factor', minDelta);
        $element.css('transform', transform).attr('scale-factor', minDelta);

        return minDelta;
    }

    // Check params existance in URL and perform matching actions
    function triggerParamsActions () {
        if ( checkURLParam('autoplay') || checkURLParam('isAutoPlay') ) playWrap();
        if ( checkURLParam('agenda') ) sectionsScreen();
        if ( checkURLParam('hidebuttons') || checkURLParam('isHideButtons') ) hideGUIForever();
        if ( checkURLParam('hidecontrols') ) hideControls();
        if ( checkURLParam('hidemenu') ) hideMenu();
        if ( checkURLParam('stop') ) defaultStopDuration = +getParameterByName('stop');
    }

    // Returns parameter value by it's name
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    // return true if term located in URL
    function checkURLParam ( term ) {
        var url = window.location.href;

        if( url.indexOf('?' + term) != -1 )
            return true;
        else if( url.indexOf('&' + term) != -1 )
            return true;

        return false
    }

    function setPresentationInfo () {
        var pName = EM.scenemanager.presentation.core.name,
            oName = EM.scenemanager.presentation.userInfo.userName,
            oPage = EM.scenemanager.presentation.userInfo.userPage;

        $('.presentation-title').text( pName );
        $('.presentation-author').text( oName );

        // update author name to serve as link to his personal page
        $('.presentation-author').attr('href', oPage);
    }

    function setPlayerCookies () {
        var isPureUser = $.cookie('ezaffid') === undefined && $.cookie('ezcampid') === undefined && $.cookie('ezsubid') === undefined;
        if ( isPureUser && !isEditor){
            $.cookie('ezaffid', 'player', { expires: 365, domain: 'emaze.com' });
            $.cookie('ezcampid', EM.scenemanager.presentation.core.presentationId, { expires: 365, domain: 'emaze.com' });
            $.cookie('ezsubid', EM.scenemanager.presentation.userInfo.userID, { expires: 365, domain: 'emaze.com' });
        }
    }

    return {
        init: init,
        goToSlide: go,
        nextSlide: next,
        prevSlide: prev,
        playButton: play,
        reload: reload,
        changeTheme: changeTheme,
        removeLoader: removeLoader,
        getSlideNumber: setSlideNumberFromURL,
        sharePopup: sharePopup
    }

}(jQuery));