import { Component, computed, input } from '@angular/core';
import { NIVEL } from '../../core/models/rotulos';

/** Etiqueta PROJETO / TAREFA / SUBTAREFA. */
@Component({
  selector: 'app-nivel',
  template: `<span class="lvl">{{ texto() }}</span>`,
})
export class NivelComponent {
  readonly nivel = input.required<number>();
  protected readonly texto = computed(() => NIVEL[this.nivel()] ?? '');
}
