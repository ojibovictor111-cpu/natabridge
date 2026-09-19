import { Component } from '@angular/core';
import { H1 } from '../../../core/typography/h1/h1';
import { Muted } from '../../../core/typography/muted/muted';
import { Footer } from '../../footer/footer';
import { RouterModule } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { fluentTextQuoteOpening } from '@ng-icons/fluent-ui';

@Component({
  selector: 'nata-heros',
  imports: [H1, Muted, Footer, RouterModule, NgIcon],
  templateUrl: './heros.html',
  styleUrl: './heros.css',
  viewProviders: [
    provideIcons({
      fluentTextQuoteOpening,
    }),
  ],
})
export class Heros {}
