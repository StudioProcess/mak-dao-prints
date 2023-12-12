#!/bin/zsh

AXICLI_PATH="$HOME/code/axicli/venv/bin/"
MODEL=2 # 2 .. AxiDraw V3/A3 or SE/A3
PEN_POS_DOWN=45 # 0-100 (Default: 40)
PEN_POS_UP=60 # 0-100 (Default: 60)
REORDERING=4  # 0-4 (Default: 0) 4..None
SPEED_PENDOWN=25 # 1-110 (Default: 25)
SPEED_PENUP=75 # 1-110 (Default: 75)


PATH=$AXICLI_PATH:$PATH # Set path
axicli --model $MODEL --reordering $REORDERING --pen_pos_down $PEN_POS_DOWN --pen_pos_up $PEN_POS_UP --speed_pendown $SPEED_PENDOWN --speed_penup $SPEED_PENUP --progress --report_time $1
axicli --mode align # Release motors
