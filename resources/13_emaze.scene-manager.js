
EM.scenemanager = (function($){

    var isStatic = $('html').data('static') === true,
        isDownload = $('html').data('download') === true,
        isCompatible = true,
        slidedeck,//parsed slidedeck
        attempt = 0; //presentation object fetching attempts

    /*** Public methods ***/

    function init( id ){
        
        /* Set listeners */
        
        // Presentation Object is ready, start setting the presentation technology and assets
        $(window).one( 'presentationObjectReady', technologyWorker.init );
        
        // invoke DOM setup for the current presentation slidedeck
        $(window).one('technologyReady', slidesWorker.init );

        // Get presentation thumbnail image and set in loader background
        setLoaderThumb( id );

        // Get the presentation object and start initialization
        getPresentationObject( id );
    }

    // Clear and reset scene and it's required assets
    // in order for editor and player being synched during play from editor
    // Called from EM.player.reload();
    function reload ( slideDeck ) {
        //get prev slide count
        var slideCount =  slidedeck.sections.reduce(function (prev, current) {
            return prev + current.slides.length;
        }, 0);

        // Clear current slides.
        while (slideCount) {
            scene.deleteSlide(1);
            slideCount--;
        }

        // Set global slide deck to edtior's provided slide deck
        slidedeck = slideDeck;

        // Set the provided slides
        slidesWorker.setSlides( slidedeck );
        
    }


    /*** Private methods ***/

    // method will set EM.scenemanager.presentation according to data
    // recieved from getPresentation method from PresentController
    function getPresentationObject( id ){
        var isEditor = false;
            relativeURL = ( isEditor ) ? "/present/getPresentation?isEditor" : "/present/getPresentation",
            canContinue = true;

        try{
            isEditor = window.parent.location.href.indexOf('editor') != -1;
        } catch(e){
        }

        if ( !isStatic ){
            // Fetch presentation object using AJAX
            $.post(relativeURL, { presentationID: id }, function (data) { 
                EM.scenemanager.presentation = data;
                
                canContinue = errorHandler.init( EM.scenemanager.presentation.core.message );
                
                // Check if browser compatible with presentation
                isCompatible = EM.compatibility.isCompatible();

                if ( canContinue ) $(window).trigger('presentationObjectReady');

            })
            // Not 404 error, might worth to retry fetching the presentation object
            .fail(function(error) {            
                // retry up to 3 times
                if ( attempt < 3 ){
                    console.error('Server responded with ' + error.status + " performing retry #" + (attempt + 1) );
                    attempt++;
                    getPresentationObject( id );

                } else {
                   errorHandler.error500();
                   $(window).off('keydown');
                   console.error("Oh my, a " + error.status + " just occured.");
                }

            });

        } else {
            // Fetch presentation object from a static variable
            EM.scenemanager.presentation = presentation.Data;

            // Check if browser compatible with presentation
            isCompatible = EM.compatibility.isCompatible();
            
            // Change files path for offline
            if ( isDownload ){
                resources = "resources";
            }

            if ( canContinue ) $(window).trigger('presentationObjectReady');
        }

    }

    // will set presentation thumbnail based on presentation ID
    function setLoaderThumb ( id ) {
        if ( !isStatic ){
            // Fetch using ajax
            $.ajax({
                url: '/getThumbnail/' + id,
                type: 'GET'
            })
            .done(function(data) {
                $('#thumb-img').css('opacity', 0).attr('src', data).animate({'opacity': 1}, 'slow');
            })
            .fail(function(error) {
                console.error("Unable to retirive Presentation thumbnail, A " + error.status +" error just occured");
            });

        } else {
            // Fetch from static object
            $('#thumb-img').css('opacity', 0).attr('src', presentation.Data.theme.imageUrl).animate({'opacity': 1}, 'slow');
        }   
    }

    // technologyWorker.init triggers on 'slidedeckReady' event.
    // get the DOM ready for the current presentation technology data
    var technologyWorker  = {
        init: function () {
          //  if (!$('html').data('download')) {
                technologyWorker.setMeta();
                technologyWorker.setCSS(EM.scenemanager.presentation.theme.cssUrl);
                technologyWorker.setThemeCSS(EM.scenemanager.presentation.theme.themeUrl);
                technologyWorker.setScripts(EM.scenemanager.presentation.theme.jsUrl);
          //  }
        },
        // setMeta will append/update meta tags (fb, twitter, etc.)
        setMeta: function(){
            var pName = EM.scenemanager.presentation.core.name,//presentation name
                oName = EM.scenemanager.presentation.userInfo.userName,//owner name
                playerUrl = EM.scenemanager.presentation.theme.playerUrl,
                thumbUrl = EM.scenemanager.presentation.theme.imageUrl,
                description = EM.scenemanager.presentation.core.description;

            $('title').html( pName + ' by ' + oName + ' on emaze');

            $('link[rel="canonical"]').attr('href', playerUrl);
            
            // Facebook meta
            $('meta[name="og:url"]').attr("content", playerUrl);
            $('meta[name="og:title"]').attr("content", pName);
            $('meta[name="og:image"]').attr("content", thumbUrl);
            $('meta[name="og:description"]').attr("content", thumbUrl);

            // Twitter meta
            $('meta[name="twitter:url"]').attr("content", playerUrl);
            $('meta[name="twitter:title"]').attr("content", pName);
            $('meta[name="twitter:description"]').attr("content", description);
            $('meta[name="twitter:image"]').attr("content", thumbUrl);

            $('meta[name="description"]').attr("content", description);            

        },
        // setCSS will append/update given CSS paths to the DOM
        // @params: path to the CSS file, id to recognize the CSS (technology/theme)
        // TODO: verify if any chance for multiple files in the path or always will be singular
        setCSS: function( path ){
            var head  = document.getElementsByTagName('head')[0],
                link  = document.createElement('link');

            if ( !isDownload ){
                link.id    = 'technologyCSS';
                link.rel   = 'stylesheet';
                link.type  = 'text/css';
                link.href  = resources + '/' + path;
                link.media = 'all';

                head.appendChild(link);    
            }
            
        },
        // get the DOM ready for the current presentation theme files
        setThemeCSS: function( path ){
            var head  = document.getElementsByTagName('head')[0],
                link  = document.createElement('link');

            if ( !isDownload ){
                link.id    = 'themeCSS';
                link.rel   = 'stylesheet';
                link.type  = 'text/css';
                link.href  = resources + '/' + path + '.css';
                link.media = 'all';
                
                head.appendChild(link);

                if ( !isCompatible ){
                    link  = document.createElement('link');

                    link.id    = 'GenericThemeCSS';
                    link.rel   = 'stylesheet';
                    link.type  = 'text/css';
                    link.href  = environment + '/Technologies/Generic/css/generic.css';
                    link.media = 'all';

                    head.appendChild(link);
                }

            } else {
                // Add generic css if device/browser aren't compatible with theme
                if ( !isCompatible ){
                    link  = document.createElement('link');

                    link.id    = 'GenericThemeCSS';
                    link.rel   = 'stylesheet';
                    link.type  = 'text/css';
                    link.href  = $('#generic-css').attr('src');
                    link.media = 'all';

                    head.appendChild(link);
                }
            }

            

        },
        // setScripts will append/update given scripts paths to the DOM
        setScripts: function( paths ){
            
            if ( !isDownload ){
                //Theme specific js
                var script = document.createElement('script');
                script.className = 'themejs';
                script.setAttribute('src', resources + '/' + EM.scenemanager.presentation.theme.themeUrl + '.js');
                script.async = false;
                document.body.appendChild( script );

                if ( !isCompatible ){
                    $('.original-technology').remove();
                    
                    var script = document.createElement('script');
                    
                    script.className = 'technologyjs'; 
                    script.setAttribute('src', environment + '/Technologies/Generic/js/generic.js');
                    script.async = false;
                    document.body.appendChild( script );
                } else {
                    // parse paths to an array
                    var pathsArray = paths.split(',');

                    // append each given script to the DOM
                    for (var i = 0; i < pathsArray.length; i++) {

                        var script = document.createElement('script');
                        
                        script.className = 'technologyjs'; 
                        script.setAttribute('src', environment + '/' + pathsArray[i]);
                        script.async = false;
                        document.body.appendChild( script );
                    };

                    if ( paths.indexOf('zoomer') != -1 ){
                        var script = document.createElement('script');
                        
                        script.className = 'technologyjs'; 
                        script.setAttribute('src', environment + '/Technologies/Zoomer/js/movement.js');
                        script.async = false;
                        document.body.appendChild( script );
                    }
                }

            } else {
                // If we are offline and need Generic implementation
                if ( !isCompatible ){
                    $('.original-technology').remove();
                    
                    var script = document.createElement('script');
                    
                    script.className = 'technologyjs'; 
                    script.setAttribute('src', $('#generic-js').attr('src'));
                    script.async = false;
                    document.body.appendChild( script );
                }

            }

            // Listen to scene init loadfinished event and continue with
            // scene setup
            $('body').on('loadfinished', function(){
                // report technologyReady event
                $(window).trigger('technologyReady');
            });

            // check if loaded scene object is ready and init the scene
            var interval = setInterval(function(){

                if ( typeof( window.scene.init ) === "function" ){
                    clearInterval( interval );
                    scene.init('scene', { resourcesURL: resources, themeURL: EM.scenemanager.presentation.theme.themeUrl });
                }

            }, 100);
        },
        // Clearing all implemented scripts
        clearScripts: function(){
            $('.technologyjs').remove();
            $('.themejs').remove();
        },
        // Clearing current theme CSS
        clearThemeCSS: function(){
            $('#themeCSS').remove();
        }
    }

    // slidesWorker.init triggers on 'presentationObjectReady' event.
    // sets the scene
    var slidesWorker = {
        init: function(){
            // Build slidedeck from raw presentation object slidedeck
            slidedeck = isDownload ? EM_slideDeck.getSlideDeckFromDocument() : EM_slideDeck.getSLideDeckFromString(EM.scenemanager.presentation.theme.slides);
            slidesWorker.setSlides( slidedeck );            

        },
        // Method get raw (compressed) slide deck,
        // Parse it and add the slides to the DOM
        setSlides: function( slidedeck ){

            var $scene = $('#scene'),
                totalNumOfSlides = 0;

            for (i = 0; i < slidedeck.sections.length; i++) {
                sections = slidedeck.sections[i];

                for (var j = 0; j < sections.slides.length; j++) {
                    if ( isCompatible ){
                        window.scene.addSlide(sections.slides[j]);
                    }
                }

                totalNumOfSlides += sections.slides.length;
            }

            if ( EM.compatibility.getBrowser().indexOf('ie') != -1 && isDownload){
                $.cookie('totalSections', slidedeck.sections.length);
                $.cookie('totalSlides', totalNumOfSlides);
            } else {
                localStorage.setItem('totalSections', slidedeck.sections.length);
                localStorage.setItem('totalSlides', totalNumOfSlides);
            }
            
            // For now add comaptibility msg display here, until better place is found
            if ( !isCompatible ){
                $('.compatability-msg').removeClass('hidden');
                $(document).on('click', '.compatability-button', function(){
                     $('.compatability-msg').addClass('hidden');
                });    
            }

            $(window).trigger('sceneReady');

        }
    }

    var errorHandler = {
        init: function ( msg ) {
            var clean = false;// Report back if we encountered with an error or not

            switch( msg ){
                case 'E403'://No permission to view presentation
                    errorHandler.notAllowed();
                    $(window).off('keydown');
                break;
                case 'E404'://Presentation not found
                    errorHandler.error404();
                    $(window).off('keydown');
                break;
                case 'E500'://Server Error 500
                    errorHandler.error500();
                    $(window).off('keydown');
                break;
                case 'NA'://Presentation Deleted
                    errorHandler.notAvailable();
                    $(window).off('keydown');
                break;
                case 'login':
                    errorHandler.login();
                    $(window).off('keydown');
                break;
                case 'password':
                    errorHandler.password();
                    $(window).off('keydown');
                break;
                default:
                    clean = true;
                break;
            }

            // Scale the error to fit the screen
            if( !clean ){
                var scale_factor = $(window).width() / 1920;

                $('#the-error').children().css('-webkit-transform', 'scale(' + scale_factor + ')');
                $('#the-error').children().css('-moz-transform', 'scale(' + scale_factor + ')');
                $('#the-error').children().css('-ms-transform', 'scale(' + scale_factor + ')');
                $('#the-error').children().css('transform', 'scale(' + scale_factor + ')');
            }

            return clean;
        },
        error404: function(){
            $('#menu-container').addClass('hidden');
            EM.player.removeLoader();
            
            $('.error-image').addClass('error-404')
            $('.error-header').text('DOH!');
            $('.error-text').text("We looked everywhere and we're unable to find the requested presentation.");
            $('.close-button').on('click', function(){
                window.location.href = '/mypresentations';
            });

            $('#the-error').fadeIn(300);
        },
        error500: function(){
            $('#menu-container').addClass('hidden');
            EM.player.removeLoader();
            
            $('.error-image').addClass('error-500')
            $('.error-header')
                .html("TOTO,<br/><span>we're not in Kansas anymore...</span>")
                .css('font-size', '6em');
            $('.error-text').text("A server error occured and unexplained things are happening around us.");
            $('.close-button').on('click', function(){
                window.location.href = '/mypresentations';
            });

            $('#the-error').fadeIn(300);
        },
        login: function(){
            $('#menu-container').addClass('hidden');
            EM.player.removeLoader();

            $('.close-button').hide();

            $('#the-error').fadeIn(300);
            $('.form-header p').text('Private: Please Login');
            $('.description').text('This presentation is private, login to view it');
            $('#regform').show();
        },
        notAllowed: function(){
            $('#menu-container').addClass('hidden');
            EM.player.removeLoader();
            
            $('.error-image').addClass('error-allow')
            $('.error-header').text('Shhhhh...');
            $('.error-text').text("The presentation you are trying to access is private, you do not have permission to view it.");
            $('.close-button').on('click', function(){
                window.location.href = '/mypresentations';
            });

            $('#the-error').fadeIn(300);
        },
        notAvailable: function(){
            $('#menu-container').addClass('hidden');
            EM.player.removeLoader();
            
            $('.error-image').addClass('error-deleted')
            $('.error-header').text('So sorry!');
            $('.error-text').text("This presentation has been deleted.");
            $('.close-button').on('click', function(){
                window.location.href = '/mypresentations';
            });

            $('#the-error').fadeIn(300);
        },
        password: function(){
            $('#menu-container').addClass('hidden');
            EM.player.removeLoader();

            $('#the-error').fadeIn(300);

            $('.close-button').hide();

            $('#the-error').fadeIn(300);
            $('.form-header p').text('Password Protected');
            $('.description').text('This presentation is password protected. Please enter your password:');

            $('#passwordProtected').show();

            $('.gopassgo').on('click', function(event) {
                event.preventDefault();

                $.ajax({
                    url: "/Password/index",
                    type: "POST",
                    data: {
                        presentationId: presentationId,
                        password: $('.passy').val()
                    },
                    success: function(data){

                        if ( data === 'true') {                            
                                setTimeout(function () {
                                    window.location.reload(); // clear cache
                                }, 1000);                            
                                //window.location.href = "/" + presentationId;
                        } else {
                            $('#passwordProtected .field-validation-error-password')
                            .hide()
                            .text( 'Wrong Password' )
                            .show()
                            .animate({'bottom': '0px'}, 300, 'easeOutBounce', function(){
                                // Hide error messages on input focus
                                $('input').one('focus', function(){
                                    $('.field-validation-error-password')
                                    .add('.field-validation-error-user')
                                    .delay(300)
                                    .animate({'bottom': '-40px'}, 300).empty();

                                });
                            });
                        }
                    }
                });

            });
        }
    }

    // Return slide
    function getSlideByPosition (pos) {
        var counter = 0;

        for (i = 0; i < slidedeck.sections.length; i++) {
            sections = slidedeck.sections[i];

            for (var j = 0; j < sections.slides.length; j++) {
                
                if ( counter == pos ){
                    return sections.slides[j];
                }

                counter++;
            }
        }
    }

    // Return slide
    function getSectionNameBySlide (pos) {
        var counter = 0;

        for (i = 0; i < slidedeck.sections.length; i++) {
            sections = slidedeck.sections[i];

            for (var j = 0; j < sections.slides.length; j++) {
                
                if ( counter == pos ){
                    return sections.title;
                }

                counter++;
            }
        }

    }

    // return parsed slidedeck
    function getSlidedeck () {
        return slidedeck;
    }

    //public methods
    return {
        init: init,
        reload: reload,
        clearTheme: technologyWorker.clearThemeCSS,
        setTheme: technologyWorker.setThemeCSS,
        getSlidedeck: getSlidedeck,
        getSlideByPosition: getSlideByPosition,
        getSectionNameBySlide: getSectionNameBySlide
    }

}(jQuery));