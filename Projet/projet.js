function loadText(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.overrideMimeType("text/plain");
    xhr.send(null);
    if(xhr.status === 200)
        return xhr.responseText;
    else {
        return null;
    }
}

// variables globales du programme;
var canvas;
var gl; //contexte
var program; //shader program
var attribPos; //attribute position
var attribCol; //Attribute color
var attribTrans; //Attribute translation
var valueTrans; //Value of translation
var attribPro; //Attribute matrice
var projection; //matrice
var attribFudge; //Attribute fudgeFactor
var valueFudge = 1.0; //Value of fudgeFactor
var buffer;
var bufferColor;
var points; //Array of coordinates to define points
var nbPoints; //Nombre de points
var movable = false; // boolean for moving while mouse is pressed and dragged
var oldMouseX; //Variable déinissant la dernière valeur X reçue lors d'une rotation avec le clique de souris
var oldMouseY; //Variable déinissant la dernière valeur Y reçue lors d'une rotation avec le clique de souris

function initContext() {
    canvas = document.getElementById('dawin-webgl');
    gl = canvas.getContext('webgl');
    if (!gl) {
        console.log('ERREUR : echec chargement du contexte');
        return;
    }
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
}

//Initialisation des shaders et du program
function initShaders() {
    var fragmentSource = loadText('fragment.glsl');
    var vertexSource = loadText('vertex.glsl'); //vertex2 pour la matrice

    var fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, fragmentSource);
    gl.compileShader(fragment);

    var vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, vertexSource);
    gl.compileShader(vertex);

    gl.getShaderParameter(fragment, gl.COMPILE_STATUS);
    gl.getShaderParameter(vertex, gl.COMPILE_STATUS);

    if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(fragment));
    }

    if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(vertex));
    }

    program = gl.createProgram();
    gl.attachShader(program, fragment);
    gl.attachShader(program, vertex);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log("Could not initialise shaders");
    }
    gl.useProgram(program);
}

//Événements
function initEvents() {
    $('#dawin-webgl').mousedown(function(e) {
        movable = true; //On rend la rotation possible quand le clique gauche est pressé sur le canvas
    })
    $(document).mouseup(function(e) {
        movable = false; //On retire ce fonctionnement si le bouton est relâché, peu importe la localisation sur la page
    })
    //Pour que cet événement se déclenche, il faut avoir cliqué et maintenu le bouton gauche de la souris enfoncé puis déplacé la souris
    //sur le canvas pour voir le cube tourner en suivant la position du pointeur sur celui-ci. Les coordonnées sont multipliées par PI
    //pour que les bords du canvas correspondent à PI, rotation maximale possible. Les sliders se modifient en direct.
    $('#dawin-webgl').mousemove(function(e) {
        if(movable){ //On vérifie que l'objet peut être bougé, sinon rien ne se produit (ie. survol du canvas)
            //x et y sont calculés pour avoir une valeur comprise entre PI et -PI afin que la rotation respecte les limites des sliders
            var x = ((e.pageX/canvas.width)*2.0 - 1.0) * Math.PI;
            var y = (((canvas.height-e.pageY)/canvas.height)*2.0 - 1.0) * Math.PI;
            if(x != oldMouseX) {
                rotate(valAngleX.innerHTML, x, valAngleZ.innerHTML);
                valAngleY.innerHTML = x;
                oldMouseX = x;
                $('#angleY').val(valAngleY.innerHTML);
            }
            if(y != oldMouseY) {
                //Utilisation de -y car sinon il y a inversion verticale de la rotation
                rotate(-y, valAngleY.innerHTML, valAngleZ.innerHTML);
                valAngleX.innerHTML = -y;
                oldMouseY = -y;
                $('#angleX').val(valAngleX.innerHTML);
            }
        }
    })

    //Cet événement permet de réagir au changement de position de la molette de la souris et effectuer un zoom/dézoom
    $('#dawin-webgl').bind('mousewheel', function(e){
        if(e.originalEvent.wheelDelta /120 > 0) { //Condition qui permet de savoir si on a monté ou descendu la molette
            var float = parseFloat(valZoom.innerHTML);
            if(float+0.1 > 5) return;
            setZoom(float+0.1);
            valZoom.innerHTML = float+0.1;
            $('#zoom').val(valZoom.innerHTML);
        } else {
            var float = parseFloat(valZoom.innerHTML);
            if(float-0.1 < 0.1) return;
            setZoom(float-0.1);
            valZoom.innerHTML = float-0.1;
            $('#zoom').val(valZoom.innerHTML);
        }
    });
    
    //Association des valeurs des sliders et de leurs valeurs affichées dans des variables pour une meilleure lisiblité dans les événements
    var FOV = document.getElementById("FOV");
    var zoom = document.getElementById("zoom");
    var X = document.getElementById("X");
    var Y = document.getElementById("Y");
    var Z = document.getElementById("Z");
    var AngleX = document.getElementById("angleX");
    var AngleY = document.getElementById("angleY");
    var AngleZ = document.getElementById("angleZ");
    var valZoom = document.getElementById("valZoom");
    var valx = document.getElementById("valx");
    var valy = document.getElementById("valy");
    var valz = document.getElementById("valz");
    var valAngleX = document.getElementById("valAngleX");
    var valAngleY = document.getElementById("valAngleY");
    var valAngleZ = document.getElementById("valAngleZ");
    valFOV.innerHTML = FOV.value;
    valZoom.innerHTML = zoom.value;
    valx.innerHTML = X.value;
    valy.innerHTML = Y.value;
    valz.innerHTML = Z.value;
    valAngleX.innerHTML = AngleX.value;
    valAngleY.innerHTML = AngleY.value;
    valAngleZ.innerHTML = AngleZ.value;
    oldMouseX = valAngleX.innerHTML; //On donne la valeur initiale des angles aux deux variables associées à la rotation
    oldMouseY = valAngleY.innerHTML; //avec le clique de souris

    //Événements liés aux différentes sliders
    FOV.oninput = function(){
        setFov(this.value);
        valFOV.innerHTML = this.value;
    }
    zoom.oninput = function(){
        setZoom(this.value);
        valZoom.innerHTML = this.value;
    }
    X.oninput = function() {
        translate(this.value, valy.innerHTML, valz.innerHTML);
        valx.innerHTML = this.value;
    }
    Y.oninput = function() {
        translate(valx.innerHTML, this.value, valz.innerHTML);
        valy.innerHTML = this.value;
    }
    Z.oninput = function() {
        translate(valx.innerHTML, valy.innerHTML, this.value);
        valz.innerHTML = this.value;
    }
    AngleX.oninput = function() {
        rotate(this.value, valAngleY.innerHTML, valAngleZ.innerHTML);
        valAngleX.innerHTML = this.value;
    }
    AngleY.oninput = function() {
            rotate(valAngleX.innerHTML, this.value, valAngleZ.innerHTML);
        valAngleY.innerHTML = this.value;
    }
    AngleZ.oninput = function() {
        rotate(valAngleX.innerHTML, valAngleY.innerHTML, this.value);
        valAngleZ.innerHTML = this.value;
    }

    //Colorpicker utilisant farbtastic
    $('#colorpicker').farbtastic('#color');
    $('#colorpicker').on('click', function(){setColor($('#color')[0].style.backgroundColor);});

    //Événement permettant le changement de couleur du cube
    function setColor(colorHex){
        //On récupère la couleur au format hexadécimal, puis on la transforme en valeurs compréhensibles 
        //en limitant la perte de précision par l'usage de float
        colorsOnly = colorHex.substring(colorHex.indexOf('(') + 1, colorHex.lastIndexOf(')')).split(/,\s*/),
        red = parseFloat(colorsOnly[0]);
        green = parseFloat(colorsOnly[1]);
        blue = parseFloat(colorsOnly[2]);
        //On réaffecte l'ensemble des couleurs du buffer les contenant, un léger décalage d'une couleur différente par face permet de
        //garder une légère nuance qui rend les différentes faces identifiables
        for(var i = 0; i < pointColor.length; i = i+4){
            if(i <= 23){
                pointColor[i] = red/255+0.1;
                pointColor[i+1] = green/255;
                pointColor[i+2] = blue/255;
            }
            if(i > 23 && i <= 47) {
                pointColor[i] = red/255-0.1;
                pointColor[i+1] = green/255;
                pointColor[i+2] = blue/255;
            }
            if(i > 47 && i <= 71){
                pointColor[i] = red/255;
                pointColor[i+1] = green/255+0.1;
                pointColor[i+2] = blue/255;
            }
            if(i > 71 && i <= 95){
                pointColor[i] = red/255;
                pointColor[i+1] = green/255-0.1;
                pointColor[i+2] = blue/255;
            }
            if( i > 95 && i <= 119) {
                pointColor[i] = red/255;
                pointColor[i+1] = green/255;
                pointColor[i+2] = blue/255+0.1;                
            }
            if(i > 119){
                pointColor[i] = red/255;
                pointColor[i+1] = green/255;
                pointColor[i+2] = blue/255-0.1;
            }
            
        }
        //On redessine avec les nouvelles couleurs
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColor);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointColor), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attribCol);
        gl.vertexAttribPointer(attribCol, 4, gl.FLOAT, true, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, nbPoints);
    }
}


function setFov(newFov){
    var FOV = newFov * Math.PI / 180;
    mat4.perspective(projection, FOV, 1, 0.01, 1000);
    gl.uniformMatrix4fv(attribPro, false,  projection);
    gl.drawArrays(gl.TRIANGLES, 0, nbPoints);

}

function setZoom(zoom){
    valueTrans = mat4.create();
    mat4.identity(valueTrans);

    var vecTrans = [$('#valx')[0].innerHTML, $('#valy')[0].innerHTML,$('#valz')[0].innerHTML];
    mat4.translate(valueTrans, valueTrans, vecTrans);

    mat4.rotateX(valueTrans, valueTrans, $('#valAngleX')[0].innerHTML);
    mat4.rotateY(valueTrans, valueTrans, $('#valAngleY')[0].innerHTML);
    mat4.rotateZ(valueTrans, valueTrans, $('#valAngleZ')[0].innerHTML);

    var vecScale = [zoom, zoom, zoom];
    mat4.scale(valueTrans, valueTrans, vecScale);

    gl.uniformMatrix4fv(attribTrans, false,  valueTrans);

    gl.drawArrays(gl.TRIANGLES, 0, nbPoints);
}

function translate(x, y, z){
    var vecTrans = [x, y, z];
    valueTrans = mat4.create();
    mat4.identity(valueTrans);
    
    mat4.translate(valueTrans, valueTrans, vecTrans);

    mat4.rotateX(valueTrans, valueTrans, $('#valAngleX')[0].innerHTML);
    mat4.rotateY(valueTrans, valueTrans, $('#valAngleY')[0].innerHTML);
    mat4.rotateZ(valueTrans, valueTrans, $('#valAngleZ')[0].innerHTML);

    var vecScale = [$('#valZoom')[0].innerHTML, $('#valZoom')[0].innerHTML, $('#valZoom')[0].innerHTML];
    mat4.scale(valueTrans, valueTrans, vecScale);

    gl.uniformMatrix4fv(attribTrans, false,  valueTrans);

    gl.drawArrays(gl.TRIANGLES, 0, nbPoints);
}

function rotate(ChangedAngleX, ChangedAngleY, ChangedAngleZ){
    valueTrans = mat4.create();
    mat4.identity(valueTrans);

    var vecTrans = [$('#valx')[0].innerHTML, $('#valy')[0].innerHTML,$('#valz')[0].innerHTML];
    mat4.translate(valueTrans, valueTrans, vecTrans);

    mat4.rotateX(valueTrans, valueTrans, ChangedAngleX);
    mat4.rotateY(valueTrans, valueTrans, ChangedAngleY);
    mat4.rotateZ(valueTrans, valueTrans, ChangedAngleZ);

    var vecScale = [$('#valZoom')[0].innerHTML, $('#valZoom')[0].innerHTML, $('#valZoom')[0].innerHTML];
    mat4.scale(valueTrans, valueTrans, vecScale);

    gl.uniformMatrix4fv(attribTrans, false,  valueTrans);

    gl.drawArrays(gl.TRIANGLES, 0, nbPoints);
}

//Fonction initialisant les attributs pour l'affichage (position et taille)
function initAttributes() {

    points = [
        // Face avant
        -0.5, -0.5, 0.5, 1.0,
        0.5, -0.5, 0.5, 1.0,
        0.5,  0.5, 0.5, 1.0,
        -0.5,  -0.5, 0.5, 1.0,
        0.5, 0.5,  0.5, 1.0,
        -0.5, 0.5,  0.5, 1.0,

        // Face arrière
        -0.5, -0.5, -0.5, 1.0,
        -0.5,  0.5, -0.5, 1.0,
        0.5,  0.5, -0.5, 1.0,
        -0.5, -0.5, -0.5, 1.0,
        0.5, -0.5, -0.5, 1.0,
        0.5,  0.5, -0.5, 1.0,

        // Face supérieure
        -0.5,  0.5, -0.5, 1.0,
        -0.5,  0.5, 0.5, 1.0,
        0.5,  0.5, 0.5, 1.0,
        0.5,  0.5, 0.5, 1.0,
        0.5,  0.5, -0.5, 1.0,
        -0.5,  0.5, -0.5, 1.0,

        // Face inférieure
        -0.5, -0.5, -0.5, 1.0,
        0.5, -0.5, -0.5, 1.0,
        0.5, -0.5, 0.5, 1.0,
        -0.5, -0.5, -0.5, 1.0,
        -0.5, -0.5, 0.5, 1.0,
        0.5, -0.5, 0.5, 1.0,
        
        // Face droite
        0.5, -0.5, -0.5, 1.0,
        0.5,  0.5, -0.5, 1.0,
        0.5,  0.5, 0.5, 1.0,
        0.5,  0.5, 0.5, 1.0,
        0.5, -0.5, 0.5, 1.0,
        0.5, -0.5, -0.5, 1.0,
        
        // Face gauche
        -0.5, -0.5, -0.5, 1.0,
        -0.5, -0.5, 0.5, 1.0,
        -0.5,  0.5, 0.5, 1.0,
        -0.5, -0.5, -0.5, 1.0,
        -0.5,  0.5, -0.5, 1.0,
        -0.5,  0.5, 0.5, 1.0
    ]

    pointColor = [
        // Face avant
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,

        // Face arrière
        0.5, 0, 0.5, 1.0,
        0.5, 0, 0.5, 1.0,
        0.5, 0, 0.5, 1.0,
        0.5, 0, 0.5, 1.0,
        0.5, 0, 0.5, 1.0,
        0.5, 0, 0.5, 1.0,

        // Face supérieure
        0, 0.5, 0.5, 1.0,
        0, 0.5, 0.5, 1.0,
        0, 0.5, 0.5, 1.0,
        0, 0.5, 0.5, 1.0,
        0, 0.5, 0.5, 1.0,
        0, 0.5, 0.5, 1.0,

        // Face inférieure
        0.5, 0.5, 0, 1.0,
        0.5, 0.5, 0, 1.0,
        0.5, 0.5, 0, 1.0,
        0.5, 0.5, 0, 1.0,
        0.5, 0.5, 0, 1.0,
        0.5, 0.5, 0, 1.0,
        
        // Face droite
        0.1, 0.2, 0.3, 1.0,
        0.1, 0.2, 0.3, 1.0,
        0.1, 0.2, 0.3, 1.0,
        0.1, 0.2, 0.3, 1.0,
        0.1, 0.2, 0.3, 1.0,
        0.1, 0.2, 0.3, 1.0,
        
        // Face gauche
        0.3, 0.2, 0.1, 1.0,
        0.3, 0.2, 0.1, 1.0,
        0.3, 0.2, 0.1, 1.0,
        0.3, 0.2, 0.1, 1.0,
        0.3, 0.2, 0.1, 1.0,
        0.3, 0.2, 0.1, 1.0
    ]
}

//Initialisation des buffers
function initBuffers() {
    buffer = gl.createBuffer();
    bufferColor = gl.createBuffer();
    nbPoints = 36;
}

//Fonction permettant le dessin dans le canvas
function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    projection = mat4.create();
    mat4.perspective(projection, Math.PI/4, 1, 0.01, 1000);
    attribPro = gl.getUniformLocation(program, "projection");
    gl.uniformMatrix4fv(attribPro, false,  projection);

    valueTrans = mat4.create();
    mat4.identity(valueTrans);

    attribTrans = gl.getUniformLocation(program, "transformation");
    gl.uniformMatrix4fv(attribTrans, false, valueTrans);

    attribFudge = gl.getUniformLocation(program, "fudgeFactor");
    gl.uniform1f(attribFudge, valueFudge);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    attribPos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(attribPos);
    gl.vertexAttribPointer(attribPos, 4, gl.FLOAT, true, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointColor), gl.STATIC_DRAW);
    attribCol = gl.getAttribLocation(program, "color");
    gl.enableVertexAttribArray(attribCol);
    gl.vertexAttribPointer(attribCol, 4, gl.FLOAT, true, 0, 0);
    
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, nbPoints);
}

function main() {
    initContext();
    initShaders();
    initAttributes();
    initBuffers();
    initEvents();
    draw();
}
