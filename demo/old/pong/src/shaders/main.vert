#version 300 es

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_color;

out vec3 v_color;

uniform mat3 u_model;
uniform mat3 u_view;
uniform mat3 u_projection;

void main() {
  vec3 world_pos = u_model * vec3(a_position, 1);
  vec3 view_pos = u_view * world_pos;
  vec3 projection_pos = u_projection * view_pos;
  gl_Position = vec4(projection_pos.xy, 0, 1);
  v_color = a_color;
}