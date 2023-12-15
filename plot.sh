#!/bin/zsh

AXICLI_PATH="$HOME/code/axicli/venv/bin/"
MODEL=2 # 2 .. AxiDraw V3/A3 or SE/A3
PEN_POS_DOWN=45 # 0-100 (Default: 40)
PEN_POS_UP=60 # 0-100 (Default: 60)
REORDERING=4  # 0-4 (Default: 0) 4..None
SPEED_PENDOWN=10 # 1-110 (Default: 25)
SPEED_PENUP=30 # 1-110 (Default: 75)
OUT="plot.svg"

YELLOW='\033[93m'
OFF='\033[0m'
PATH=$AXICLI_PATH:$PATH # Set path

trap ctrl_c INT

function ctrl_c() {
    # Interrupted. Just continue
}

function plot() {
    axicli --model $MODEL --reordering $REORDERING --pen_pos_down $PEN_POS_DOWN --pen_pos_up $PEN_POS_UP --speed_pendown $SPEED_PENDOWN --speed_penup $SPEED_PENUP --progress --report_time --output_file "$OUT" "$@"
}

function yellow() {
    echo $YELLOW"$@"$OFF
}

# Release motors
function align() {
    echo $(yellow "Aligning...")
    axicli --mode align
}

# Cycle pen servo
function cycle() {
    echo $(yellow "Cycling...")
    axicli --mode cycle
}

# check for paused print
# out file exists and pause_dist is non-negative
function resumable() {
    [[ -f "$OUT" && ! -z $(grep 'pause_dist="[^-]' "$OUT") ]]
}

function resume() {
    while resumable; do
        echo $(yellow "Resume plot")
        
        # return home ? (esc to deny)
        read -k -s "x?Return home first? (Enter/Esc)? "
        echo
        if [[ $x == $'\n' ]]; then
            echo "Returning home..."
            plot --mode res_home "$OUT"
        fi
        
        # press key to resume (esc to stop)
        read -k -s "x?Ready to resume? (Enter/Esc)? "
        echo
        if [[ $x == $'\n' ]]; then
            echo "Resuming..."
            plot --mode res_plot "$OUT"
        else
            break
        fi
    done
}

case $1 in
    "-a"|"--align") align; exit ;;
    "-c"|"--cycle") cycle; exit ;;
esac

# don't try to resume last plot, position might be messed up
# resume

# plot current
plot $1

# resume this plot (in case it was paused)
# should only call if something was plotted, but both errors AND pauses both return exit code 1
resume

# release motors
align
