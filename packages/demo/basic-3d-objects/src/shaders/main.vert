#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texcoord;

out vec4 v_pos;
out vec4 v_epos;
out vec3 v_normal;
out vec2 v_texcoord;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

void main() {
  vec4 world_pos = u_model * vec4(a_position, 1);
  v_epos = u_view * world_pos;
  v_pos = u_projection * v_epos;
  gl_Position = v_pos;

  v_normal = normalize(mat3(u_view * u_model) * a_normal);
  v_texcoord = a_texcoord;
}