import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { Logout } from './logout';

describe('Logout', () => {
  let component: Logout;
  let fixture: ComponentFixture<Logout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logout],
      providers: [{ provide: MatDialogRef, useValue: { close: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Logout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
