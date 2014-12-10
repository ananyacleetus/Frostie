var zoomerInit = new function () {
    this.set = function (s) {
        // location: x,y,z
        // rotation: rx,ry,rz. Use 0-360 to prevent carousel problems
        // width: w (height is calculated as 16*9)
        // reverse: come to the slide from the other direction
        // s.addTarget(x, y, z, rx, ry, rz, width, animation-duration);

        
        //Starting position - Showing once
        s.setLocation(938, 1230, 120, -90, 90, 0, 250, 2000);

        //Slide 1
        s.addTarget(658, 1230, 120, -90, 90, 0, 250, 2500);

        //Glide from 1 to 2
        s.addGlide(658,900,120,-90,90,0,250, 2210);

        //Slide 2
        s.addTarget(-77,1177,120,-90,90,0,250, 2000);

        //Slide 3
        s.addTarget(80, 720, 120, -90, 0, 0, 250, 2000);

        //Glide from 3 to 4
        s.addGlide(480,800,120,-90,0,0,250, 2000);

        //Slide 4
        s.addTarget(410,-10, 120, -90, 0, 0, 250, 2700);

        //Slide 5
        s.addTarget(600, 180, 120, -90, -90, 0, 250, 2200);

        //Glide from 5 to  6
        s.addGlide(660, 520, 120, -90, -90, 0, 250, 1300);

        //Slide 6
        s.addTarget(1260, 250, 120, -90, -90, 0, 250, 3000); 

        //Slide 7
        s.addTarget(690, 140, 120, -90, 90, 0, 150, 1800);

        //Glide from 7 to 8
        s.addGlide(800, 240, 120, -90, 150, 0, 150, 1500);

        //Slide 8
        s.addTarget(1080, 1300, 120, -90, 180, 0, 250, 3000);

        //Slide 9
        s.addTarget(1330,1130,120,-90,-90,0,250, 2500);

        //Glide from last (9) to first (1)
        
    };
}


//Glide from 7 to 8
//s.addGlide(810, 140, 120, -90, 155, 0, 150, 1700);

//Glide from 5 to  6
//s.addGlide(600, 490, 120, -90, -90, 0, 250, 1300);

//Glide from 7 to 8
//s.addGlide(760, 180, 120, -90, 155, 0, 150, 1500);

