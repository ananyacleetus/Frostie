

var EM = window['EM'] || {};

if (window['EM_Editor']) {

    var emazeApp = window['emazeApp'] || angular.module('emazeApp', []);


    emazeApp.controller('slideOptionsController', function ($scope) {

        $scope.scroll = false;
        $scope.autoPlay = false;
        $scope.stopDuration = 0;

        $scope.stopDurationAll = false;

        $scope.getSettings = function () {

            return { scroll: $scope.scroll, autoplay: $scope.autoPlay, stopduration: $scope.stopDuration };
        }

        $scope.setSettings = function (data) {
            $scope.$apply(function () {
                $scope.scroll = data.scroll;
                $scope.autoPlay = data.autoplay;
                $scope.stopDuration = data.stopduration;
                $scope.stopDurationAll = false;
            });
        }
    });
}

EM.slideOptions = (function () {

    var $scrollTarget; //the slide or edit surface that horzontal scroll feature is applied to
    var scroll_l; //left bound of scrollable area
    var scroll_r; //right bound of scrollable area
    var isEditor = window['EM_Editor'] != undefined;
    
    function init() {
        attachEventHandlers();
    }
    //   EM.slideOptions.setScroll(EM_SlideManager.getSelectedSlide().data('scroll'), EM_Document.$editSurface[0]);
    function setScroll(isScroll, target) {
        target.style['overflow'] = isScroll ? 'auto' : '';
    }

    function scrollRight(e) {
        var x = window.innerWidth + 3 - e.pageX; //+ 3 to elimiate zero and small numbers
        var duration = (x * 30) + $scrollTarget[0].scrollWidth/7;  //factor in the the distance we need to cover and allow more time for greater distances
        $scrollTarget.stop();
        animateHorizontalScroll($scrollTarget, duration, false);
    }

    function animateHorizontalScroll($scrollTarget, duration, isLeft) {
        if (isLeft) {
            $scrollTarget.animate({ scrollLeft: 0 }, duration);
        } else {
            $scrollTarget.animate({ scrollLeft: $scrollTarget[0].scrollWidth - $scrollTarget.width() }, duration);
        }
    }

    function scrollLeft(e) {
        var x = e.pageX - scroll_trim + 3; //+ 3 to elimiate zero and small numbers
        var duration = (x * 30 ) + $scrollTarget[0].scrollWidth/7;  //factor in the the distance we need to cover and allow more time for greater distances
        $scrollTarget.stop();
        animateHorizontalScroll($scrollTarget, duration, true);
    }


    function doScroll(e) {
        var x = e.pageX;

        if (isEditor && (e.pageY < 88 || EM_Document.selected.$editWrapper.is('.ui-draggable-dragging'))) { //don't activate this feature during drag becasue drag can also move the edit surface
            endScroll();
            return;  //regarding  e.pageY < 88 :  hardcoded but fast way to check if the click is below the bottom of the menu bar at the top of the editor.
        }

        scroll_trim = isEditor ? EM_Document.$editarea.offset().left : 0;
        scroll_l = $scrollTarget[0].getBoundingClientRect().left + 100;
        scroll_r = window.innerWidth - scroll_l;


        if (x < scroll_l && (!scroll_trim || x > scroll_trim)) {
            scrollLeft(e);
        } else if (x > scroll_r) {
            scrollRight(e);
        } else {
            $scrollTarget.stop();
        }
    }

    function endScroll() {
        $scrollTarget.stop();
    }

    function toggleHorizontalScroll(isScroll, $target) {
        var $leftPanel, $rightPanel, $parent, rect;

        if (!$target || !$target.length) {
            console.error('invalid $target', $target);
            return;
        }

        $scrollTarget = $target; //external scope var to be acessed in mouse move events
        scroll_trim = isEditor ? EM_Document.$editarea.offset().left : 0;
        scroll_l = $scrollTarget[0].getBoundingClientRect().left + 100;
        scroll_r = window.innerWidth - scroll_l;
       
        if (!isEditor && isScroll && $target[0].scrollWidth > $target.width()) {  // !iseditor because it has been decided to no longer use  the mousemove-scroll this medhcanism in the editor 1/10/2014. 
            $(document).on('mousemove', doScroll);
        } else {
            $(document).off('mousemove', doScroll);
        }
    }

    function refreshEditorHorizontalScrollState() { // activates/deactivates horizontal scroll on edit surface of editor depending on slide settings and scroll width
        EM.slideOptions.toggleHorizontalScroll(EM_SlideManager.getSelectedSlide().data('scroll'), EM_Document.$editSurface);
    }


    function saveSettingsToSlide() {
        var scope = EM.slideOptionsControllerScope();
        var settings = scope.getSettings();

        var $allSllides = $('#slide-container .slide');

        EM_SlideManager.getSelectedSlide().data(settings).attr({ 'data-scroll': settings.scroll, 'data-autoplay': settings.autoplay, 'data-stopduration': settings.stopduration });

        if (scope.stopDurationAll) {
            $allSllides.each(function () {
                $(this).data('stopduration', settings.stopduration).attr('data-stopduration', settings.stopduration);

            });
        }
        EM_SlideManager.SDAPI.updateSelectedSlidewrapper();  // update the current slideto save data proeprties
        setScroll(settings.scroll, EM_Document.$editSurface[0]);
        toggleHorizontalScroll(settings.scroll, EM_Document.$editSurface);

    }

    function loadSettingsFromSlide() {
        EM.slideOptionsControllerScope().setSettings(EM_SlideManager.getSelectedSlide().data());
    }

    function attachEventHandlers() {


        $('#slide-container').on('click', '.menu-slide', function () {

            var dialogButtonOK = {
                text: "APPLY", click: function () {
                    saveSettingsToSlide();
                    $(this).dialog("close");
                }
            }
            var dialogButtonCancel = {
                text: "CANCEL", click: function () {
                    $(this).dialog("close");
                }
            }

            loadSettingsFromSlide();
            $('#slide-options-form').dialog({ title: 'Slide Options', buttons: [dialogButtonOK, dialogButtonCancel], dialogClass: 'slide-options', });

            $("#scene").one('transitionStart', function () { //hide the dialog if user changes slide
                $('#slide-options-form').dialog('close');
            });
        });

    }

    return {
        init: init,
        loadSettingsFromSlide: loadSettingsFromSlide,
        setScroll: setScroll,
        toggleHorizontalScroll: toggleHorizontalScroll,
        refreshEditorHorizontalScrollState: refreshEditorHorizontalScrollState,
        animateHorizontalScroll: animateHorizontalScroll
    }

})();







