import { AfterViewInit, Component } from '@angular/core';
import { LandingNavBar } from '../../components/nav-bars/landing-nav-bar/landing-nav-bar';
import { Heros } from '../../components/sections/heros/heros';

@Component({
  selector: 'nata-home',
  imports: [LandingNavBar, Heros],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements AfterViewInit {
  ngAfterViewInit() {
    void import('aos').then(({ default: AOS }) => AOS.init());
  }
}
