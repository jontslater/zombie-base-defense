let clickAudio: HTMLAudioElement | null = null;
let selectAudio: HTMLAudioElement | null = null;

function clickSound(): HTMLAudioElement {
  if (!clickAudio) {
    clickAudio = new Audio("/audio/ui_click.ogg");
    clickAudio.volume = 0.4;
  }
  return clickAudio;
}

function selectSound(): HTMLAudioElement {
  if (!selectAudio) {
    selectAudio = new Audio("/audio/ui_select.ogg");
    selectAudio.volume = 0.35;
  }
  return selectAudio;
}

function play(audio: HTMLAudioElement) {
  const clone = audio.cloneNode(true) as HTMLAudioElement;
  void clone.play().catch(() => {
    /* autoplay policy until user gesture */
  });
}

export function playUiClick(): void {
  play(clickSound());
}

export function playUiSelect(): void {
  play(selectSound());
}

export function wirePanelUiSounds(root: ParentNode): void {
  root.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest("button");
    if (!btn) return;
    if (btn.closest(".subtabs")) playUiSelect();
    else playUiClick();
  });
}
