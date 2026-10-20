---
title: "I built a game that teaches Vim motions: what I got wrong about teaching a modal editor"
description: "Most developers I know have the same relationship with Vim: they learned just enough to exit it, and never went further.\nI wanted to fix that, so I built Vimrealm."
pubDate: 2026-10-20
topic: "Javascript"
notionId: "3ffd7dc0-4e3b-80f8-bef5-d2cc76740cbb"
---

Most developers I know have the same relationship with Vim: they learned just enough to exit it, and never went further.


I wanted to fix that, so I built [Vimrealm](https://vimrealm.com/?ref=portfolio): a browser RPG where you type real Vim commands to move a wizard around an isometric island made of text. Letters are stone, digits are crystal, punctuation is sandstone, spaces are grass. Press `w` and the wizard leaps to the next word. Press `dd` and a whole row of tiles drops away.


Here's what I learned building it, including the parts I got wrong.


## **Why vimtutor loses people**


`vimtutor` is good at one thing: showing you that the commands exist. It's weak at three others:

- **Modes are invisible until they bite you.** You press `i`, forget you're in Insert mode, type `dd` and get "dd" in your file.
- **There's no feedback on efficiency.** Reaching a word with `lllllllll` and with `w` looks identical to the tutorial. Vim's whole point is that these are not the same.
- **You can use everything from lesson one.** Nothing stops you from falling back on the arrow keys, so you do.

A game can fix all three, because a game has rules.


## **The design**


**Quests with a par.** Every quest has a par keystroke count, taken from a reference solution I wrote. Finish at or under par and you earn three stars. This turns "I got there" into "I got there well", and it's the part that makes people retry levels to find the shorter route. Commands like `:hint`, `:help` and `:e!` cost nothing, so asking for help is never punished.


**Spells unlock chapter by chapter.** Commands are "spells", and you only have the ones you've learned. Try something you haven't met yet and the game tells you which chapter teaches it. The arrow keys are sealed for good. Chapter 1 is `h j k l`; chapter 2 adds word motions; later chapters add operators, text objects, the dot command, search and visual mode. The curriculum ends with a boss fight against the Arrow-Key Dragon.


**Hints name the command.** Every target in a "reach" quest has a hint pointing at the spell to use. Quests come in two kinds: _reach_ (land the cursor on each gem, in order) and _edit_ (make the buffer match a goal text, with mismatched lines glowing red).


**Trials after the story.** Once the dragon falls, 60 Trials drill known spells with a twist: banned commands, a keystroke limit, a flawless run where one failed spell ends it, or a time limit that starts at your first key.


## **The technical part: a Vim emulator in plain JS**


The game is plain HTML, CSS and JavaScript. No bundler, no framework, no client-side dependencies, and the free chapters even work from `file://`. The core is an emulator that handles Normal, Insert, Replace, Visual, Visual Line and Command-line modes, with counts, operators plus motions, text objects, registers, undo/redo, dot-repeat and search.


Each keystroke flows through one pipeline:


`keydown → normalize key → quest.feed(key) → vim.feed(key) → event`


`vim.feed` returns an event describing what happened (`move`, `edit`, `mode`, `undo`, `yank` and so on) and the game reacts: sounds, hero animation, tile changes, win overlay. Keeping the engine and quest rules free of any DOM code was the best decision I made, because the same files run in Node.


**Testing it.** The emulator has to behave like real Vim, or you teach people the wrong thing. Every behaviour I add gets a test case like this:


```javascript
t(name, lines, keys, expect, start)
```


Keys are written in a small notation (`<Esc>`, `<CR>`, `<C-r>`), so a test reads like something you'd actually type.


A second test suite replays **every level's reference solution** through the real quest rules and fails if any key is rejected or the quest can't be won. That's also how par stays honest: change a level's buffer and the build tells you the solution no longer works.


**Where I stopped.** The emulator covers what the course teaches, not all of Vim. There are no macros, marks, named registers, ex ranges or `:s`, and search matches literal text rather than regex. I drew the line at the point where emulating more would teach less. A beginner doesn't need `qa` in week one, and every feature I add is one more place for the emulator to disagree with real Vim.


One small deviation I kept deliberately: in Normal mode, Backspace takes back the last pending key. Real Vim does something different there, but for a beginner who typed `d` by mistake, an undo for the pending key is friendlier than a cursor move.


## **What I don't know yet**


Vimrealm is new and I haven't had real players go through it yet, so I can't tell you which levels are confusing or where people quit. I have guesses: I suspect the jump from reach quests to edit quests in chapter 6 is the steepest point, and that par is either too strict or too forgiving.


That's exactly what I'd like to find out.


## **Try it**


The first five chapters (13 quests, all movement) are free, with no sign-up:


👉 [**vimrealm.com**](https://vimrealm.com/?ref=portfolio)


The rest (operators, text objects, the dot command, search, visual mode and the dragon) is a one-time $7.99. I'd rather say that up front than hide it.


If you'd rather read than play, I wrote two guides built around worked examples:

- [Vim text objects](https://vimrealm.com/vim-text-objects.html)
- [The Vim dot command](https://vimrealm.com/vim-dot-command.html)

I'd love to hear which chapter you got stuck on, and which Vim habit you'd want a game to teach.
