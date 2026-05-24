// Game-wide constants
export const GRAVITY = -980;
export const PLAYER_SPEED = 220;
export const PLAYER_RUN_SPEED = 350;
export const PLAYER_JUMP_FORCE = 620;
export const SCALE = 3;

export const INITIAL_LIVES = 3;
export const INITIAL_TIMER = 400;

export const SCORE_KILL_ENEMY = 100;
export const SCORE_COIN = 200;
export const SCORE_BLOCK_HIT = 50;

// Physics groups (must match project-settings.json)
export const GROUP_DEFAULT = 0;
export const GROUP_PLAYER = 1;
export const GROUP_GROUND = 2;
export const GROUP_ENEMY = 3;
export const GROUP_ITEM = 4;

// Player state
export enum PlayerState { IDLE, WALK, RUN, JUMP, DEAD, INVINCIBLE }
// Player size
export enum MarioSize { SMALL, BIG }

// Level world dimensions
export const LEVEL_WIDTH = 5000;
export const CANVAS_W = 960;
export const CANVAS_H = 640;
export const GROUND_Y = -240;   // top-of-ground y in world space
export const GROUND_HALF_H = 48;

// Animation frame names
export const ANIM_SMALL_IDLE   = ['mario_small_0.png'];
export const ANIM_SMALL_WALK   = ['mario_small_1.png', 'mario_small_2.png', 'mario_small_3.png'];
export const ANIM_SMALL_JUMP   = ['mario_small_5.png'];
export const ANIM_SMALL_DEAD   = ['mario_small_6.png'];

export const ANIM_BIG_IDLE     = ['mario_big_0.png'];
export const ANIM_BIG_WALK     = ['mario_big_1.png', 'mario_big_2.png', 'mario_big_3.png'];
export const ANIM_BIG_JUMP     = ['mario_big_5.png'];
export const ANIM_BIG_DEAD     = ['mario_big_6.png'];

export const ANIM_GOOMBA_WALK  = ['Goomba_0.png', 'Goomba_1.png'];
export const ANIM_GOOMBA_DEAD  = ['Goomba_2.png'];

export const ANIM_MUSHROOM     = ['items_0.png'];
export const ANIM_QBLOCK_ACTIVE  = ['items_10.png', 'items_11.png', 'items_12.png'];
export const ANIM_QBLOCK_USED    = ['items_10.png'];
