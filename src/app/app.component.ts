import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacaoComponent } from './shared/ui/confirmacao.component';
import { ToastComponent } from './shared/ui/toast.component';

@Component({
  imports: [RouterOutlet, ToastComponent, ConfirmacaoComponent],
  selector: 'app-root',
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
})
export class App {}
