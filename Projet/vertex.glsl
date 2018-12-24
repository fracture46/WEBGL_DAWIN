uniform mat4 transformation;
uniform mat4 projection;
uniform float fudgeFactor;
attribute vec4 position;
attribute vec4 color;
varying vec4 vColor;
void main() {
    vColor = color;
    
    gl_Position =  projection * transformation * position;

    gl_PointSize = 30.0;
}