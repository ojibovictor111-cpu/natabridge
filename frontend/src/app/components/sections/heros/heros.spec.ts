import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Heros } from './heros';

describe('Heros', () => {
  let component: Heros;
  let fixture: ComponentFixture<Heros>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Heros],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Heros);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
