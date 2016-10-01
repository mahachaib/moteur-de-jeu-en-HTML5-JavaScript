//INITS
window.onload = function init() {
    var game = new GF();
    
    game.start();
};

//GAME FRAMEWORK STARTS HERE
var GF = function () {
    //Vars relative to the canvas
    var canvas, ctx, w, h;
    
    //Vars relative to the NPG
    var listColors = ["green", "red", "blue", "yellow"],
        ballSpeed = 50;
    
    //Etat du jeu
    var tempsTotal = 0,
        etats = {
            menuPrincipal: 0,
            jeuEnCours: 1,
            gameOver: 2
        },
        etatCourant = etats.jeuEnCours,
        scoreCourant = 0;
    
    // Vars for counting frames/s, used by the measureFPS function
    var frameCount = 0,
        lastTime,
        fpsContainer,
        fps;
    
    //For time based animation
    var delta, oldTime = 0;
    
    //Vars for handling inputs
    var inputStates = {};
    
    //The monster
    var monster = {
        x: 200,
        y: 200,
        speed: 100, //pixels/s this time
        boundingCircleRadius: 70
    };
    
    //Array of balls to animate
    var ballArray = [];
    
    /*We want the rectangle to move at speed pixels/s (there are 60 frames in a second)
    * If we are really running at 60 frames/s, the delay between frames should be 1/60
    * = 16,6 ms, so the number of pixels to move = (speed * del)/1000. If the delay is twice
    * longer, the formula works : let's move the rectangle twice longer!
    */
    var calcDistanceToMove = function (delta, speed) {
        return (speed * delta) / 1000;
    };
    
    var measureFPS = function (newTime) {
        if (lastTime === undefined) {
            lastTime = newTime;
            return;
        }
        
        //Calculate the difference between last & current frame
        var diffTime = newTime - lastTime;
        
        if(diffTime >= 1000){
            fps = frameCount;
            frameCount = 0;
            lastTime = newTime;
        }
        
        //And display it in an element we appended to the doc in the start() fct
        fpsContainer.innerHTML = 'FPS: ' + fps;
        frameCount++;
    };
    
    //Clears the canvas content
    function clearCanvas () {
        ctx.clearRect(0, 0, w, h);
    }
    
    //Functions for drawing the monster and maybe other objects
    function drawMyMonster (x, y) {
        //Head
        
        //save the context
        ctx.save();
        
        //Translate the coordinate system, draw relative to it
        ctx.translate(x - 50, y - 50);
        
        // (0, 0) is the top left corner of the monster
        ctx.strokeRect(0, 0, 100, 100);
        
        //Eyes
        ctx.fillRect(20, 20, 10, 10);
        ctx.fillRect(65, 20, 10, 10);
        
        //Nose
        ctx.strokeRect(45, 40, 10, 40);
        
        //Mouth
        ctx.strokeRect(35, 84, 30, 10);
        
        //Teeth
        ctx.fillRect(38, 84, 10, 10);
        ctx.fillRect(52, 84, 10, 10);
        
        //Draw bounding circle
        ctx.beginPath();
        ctx.arc(50, 50, monster.boundingCircleRadius, 0, 2 * Math.PI);
        ctx.stroke();
        
        //Restore de contexte
        ctx.restore();
    }
    
    function timer(currentTime){
        var delta = currentTime - oldTime;
        oldTime = currentTime;
        
        return delta;
    }
    
    var mainLoop = function(time){
        clearCanvas();
        
        if(monster.dead) {
            etatCourant = etats.gameOver;
        }
        
        switch(etatCourant) {
            case etats.jeuEnCours:
                measureFPS(time);
                
                //Number of ms since last frame draw
                delta = timer(time);
                tempsTotal += delta;
                ctx.fillText("Tps de survie : " + (Math.round(tempsTotal/1000)) + "s", 5, 20);
                ctx.fillText("Score : " + scoreCourant, 5, 40);
                
                //draw the monster
                drawMyMonster(monster.x, monster.y);
                
                //Check inputs and move the monster
                updateMonsterPosition(delta);
                
                //Update and draw balls
                updateBalls(delta);
                
                break;
            case etats.gameOver:
                ctx.fillText("GAME OVER", 100, 100);
                ctx.fillText("Press SPACE to start again", 100, 150);
                
                if(inputStates.space) {
                    scoreCourant = 0;
                    monster.dead = false;
                    ballArray = [];
                    createBalls(4);
                    etatCourant = etats.jeuEnCours;
                    vitesseCourante = listeVitesseMonstre[1];
                }
                
                break;
        }
        
        requestAnimationFrame(mainLoop);        
    };
    
    function updateMonsterPosition(delta) {
        monster.speedX = monster.speedY = 0;
        
        //check inputstates
        if(inputStates.left) 
            monster.speedX = -monster.speed;
        
        if(inputStates.up) 
            monster.speedY = -monster.speed;
        
        if(inputStates.right) 
            monster.speedX = monster.speed;
        
        if(inputStates.down) 
            monster.speedY = monster.speed;
        
        if(inputStates.space) {}
        
        if(inputStates.mousePos) {}
        
        if(inputStates.mouseDown)
            monster.speed = 500;
        else 
            monster.speed = 100;
        
        //Compute the incX and inY in pixels depending on the time elapsed since last redraw
        monster.x += calcDistanceToMove(delta, monster.speedX);
        monster.y += calcDistanceToMove(delta, monster.speedY);
    }
    
    function updateBalls(delta) {
        //for each ball in the array
        for(var i=0; i < ballArray.length; i++) {
            var ball = ballArray[i];
            
            // 1) Move the ball
            ball.move();
            
            // 2) Test if the ball collides with a wall
            testCollisionWithWalls(ball);
            
            // Test collisions with the monster
            if(circRectsOverlap(monster.x - 50, monster.y - 50, 100, 100, ball.x, ball.y, ball.radius)) {                
                if(ball.color === 'red'){
                    monster.dead = true;
                } else {
                    if(ball.color === 'green'){         
                        changeBallsSpeed(2);                    
                        scoreCourant++;
                    } else if (ball.color === 'yellow'){
                        scoreCourant--;
                    } else if (ball.color === 'blue'){                   
                        //removeRedBalls();
                    }                    
                                             
                    removeBallAndGenerateNew(ball);
                }                
            }
            
            // 3) Draw the ball
            ball.draw();
        }
    }
    
    //Supprime une balle "bonus" et en crée 2 nouvelles aléatoires
    function removeBallAndGenerateNew(ball) {
        var idxRmvBall = ballArray.indexOf(ball);
        
        var tmpBallArray = [];
        
        for(var i = 0; i < ballArray.length; i++) {
            if(i !== idxRmvBall)
                tmpBallArray.push(ballArray[i]);
        }
        
        ballArray = tmpBallArray;
        
        createBalls(2);
    }
    
    function removeRedBalls(){
        var tmpBallArray = [],
            cpt = 0;
        
        for(var i = 0; i < ballArray.length && cpt < 5; i++) {
            if(ballArray[i].color === 'red' && cpt < 5)
                cpt++;
            else 
                tmpBallArray.push(ballArray[i]);
        }
        
        ballArray = tmpBallArray;
    }
    
    function changeBallsSpeed(delta){
        ctx.save();
        
        for(var i = 0; i < ballArray.length; i++) {
            ballArray[i].v += delta;
        }
        
        ctx.restore();
    }
    
    //Teste collisions entre cercles
    function circleCollide(x1, y1, r1, x2, y2, r2) {
        var dx = x1 - x2;
        var dy = y1 - y2;
        
        return ((dx * dx + dy * dy) < (r1 + r1) * (r1 + r2));
    }
    
    //collisions between rectangle
    function rectsOverlap(x0, y0, w0, h0, x2, y2, w2, h2) {
        if ((x0 > (x2 + w2)) || ((x0 + w0) < x2))
            return false;
        
        if((y0 > (y2 + h2)) || ((y0 + h0) < y2))
            return false;
        
        return true;
    }
    
    //collisions between rectangle and circle
    function circRectsOverlap(x0, y0, w0, h0, cx, cy, r) {
          var testX = cx; 
          var testY = cy; 
          
          if (testX < x0) 
              testX = x0; 
        
          if (testX > (x0+w0)) 
              testX = (x0+w0); 
        
          if (testY < y0) 
              testY = y0; 
        
          if (testY > (y0+h0)) 
              testY = (y0+h0); 
 
          return (((cx-testX)*(cx-testX)+(cy-testY)*(cy-testY))<r*r); 
    }
    
    function testCollisionWithWalls(ball) {
        // left
        if (ball.x < ball.radius) {
            ball.x = ball.radius;
            ball.angle = -ball.angle + Math.PI;
        } 
        // right
        if (ball.x > w - (ball.radius)) {
            ball.x = w - (ball.radius);
            ball.angle = -ball.angle + Math.PI; 
        }     
        // up
        if (ball.y < ball.radius) {
            ball.y = ball.radius;
            ball.angle = -ball.angle;     
        }     
        // down
        if (ball.y > h - (ball.radius)) {
            ball.y = h - (ball.radius);
            ball.angle =-ball.angle; 
        } 
    }
    
    function getMousePos(evt) {
        // necessary to take into account CSS boudaries
        var rect = canvas.getBoundingClientRect();
        
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
    
    function createBalls(numberOfBalls) {
      var i;
        
      if (ballArray.length > 0 && etatCourant !== etats.gameOver && !monster.dead) {
          i = ballArray.length;
          numberOfBalls += ballArray.length;
      } else
          i = 0;
        
      if (scoreCourant > 13)
          nbBallsColor = 3;
      else if (scoreCourant > 7)
          nbBallsColor = 2;
      else
          nbBallsColor = 1;
        
      for(i; i < numberOfBalls; i++) {
        // Create a ball with random position and speed. 
        // You can change the radius
          
        var ball =  new Ball(w*Math.random(),
                          h*Math.random(),
                          (2*Math.PI)*Math.random(),        
                          ballSpeed,
                          30,
                          listColors[Math.round(Math.random() * nbBallsColor)]);
    
        if(!circleCollide(ball.x, ball.y, ball.radius,
                       monster.x, monster.y, monster.boundingCircleRadius)) {
        // On la rajoute au tableau
        ballArray[i] = ball;
        } else {
          i--;     
        }
      }
   }       
    
    // constructor function for balls
    function Ball(x, y, angle, v, diameter, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.v = v;
        this.radius = diameter/2;
        this.color = color;
        this.dead = false;

        this.draw = function() {
        // si la balle est "morte" on ne fait rien
            if(this.dead) 
                return;

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
            ctx.fill();
            ctx.restore();
            
            //this.color = 'black';
        };

        this.move = function() {
        // si la balle est "morte" on ne fait rien
            if(this.dead) 
                return;

            // add horizontal increment to the x pos
            // add vertical increment to the y pos

            var incX = this.v * Math.cos(this.angle);
            var incY = this.v * Math.sin(this.angle);

            this.x += calcDistanceToMove(delta, incX);
            this.y += calcDistanceToMove(delta, incY);
        };
    }
    
    var start = function(){
        // adds a div for displaying the fps value
        fpsContainer = document.createElement('div');
        document.body.appendChild(fpsContainer);
      
        // Canvas, context etc.
        canvas = document.querySelector("#myCanvas");
  
        // often useful
        w = canvas.width; 
        h = canvas.height;  
  
        // important, we will draw with this object
        ctx = canvas.getContext('2d');
        // default police for text
        ctx.font="20px Arial";
      
       //add the listener to the main, window object, and update the states
        window.addEventListener('keydown', function(event){
            if (event.keyCode === 37)
               inputStates.left = true;
            else if (event.keyCode === 38)
               inputStates.up = true;
            else if (event.keyCode === 39) 
               inputStates.right = true;
            else if (event.keyCode === 40)
               inputStates.down = true;
            else if (event.keyCode === 32)
               inputStates.space = true;            
      }, false);

      //if the key will be released, change the states object 
      window.addEventListener('keyup', function(event){
          if (event.keyCode === 37) {
             inputStates.left = false;
          } else if (event.keyCode === 38) {
             inputStates.up = false;
          } else if (event.keyCode === 39) {
             inputStates.right = false;
          } else if (event.keyCode === 40) {
             inputStates.down = false;
          } else if (event.keyCode === 32) {
             inputStates.space = false;
          }
      }, false);
      
      // Mouse event listeners
      canvas.addEventListener('mousemove', function (evt) {
          inputStates.mousePos = getMousePos(evt);
      }, false);

      canvas.addEventListener('mousedown', function (evt) {
            inputStates.mousedown = true;
            inputStates.mouseButton = evt.button;
      }, false);

      canvas.addEventListener('mouseup', function (evt) {
          inputStates.mousedown = false;
      }, false);      

        // We create tge balls: try to change the parameter
        createBalls(4); 

        // start the animation
        requestAnimationFrame(mainLoop);
    };

    //our GameFramework returns a public API visible from outside its scope
    return {
        start: start
    };
};