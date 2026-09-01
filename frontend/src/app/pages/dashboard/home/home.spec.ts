import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardService } from '../../../services/dashboard/dashboard-service';
import { Home } from './home';

describe('DashboardHome', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  const assessmentDetails = signal<{ high: number; mid: number; low: number } | null>(null);
  const dashboardDetails = signal<{
    summary: { high: number; mid: number; low: number };
    priorityAssessments: [];
    recentAssessments: [];
  } | null>(null);
  const getDashboardDetails = vi.fn();

  beforeEach(async () => {
    assessmentDetails.set(null);
    dashboardDetails.set(null);
    getDashboardDetails.mockClear();

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: DashboardService,
          useValue: { assessmentDetails, dashboardDetails, getDashboardDetails },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders unavailable values without fallback patient data', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(component).toBeTruthy();
    expect(getDashboardDetails).toHaveBeenCalledOnce();
    expect(page.textContent).toContain('--');
    expect(page.textContent).toContain('No critical-alert data available');
    expect(page.textContent).toContain('No recent assessment data available');
    expect(page.textContent).not.toContain('Amina Bello');
  });

  it('renders API summary values when they become available', () => {
    assessmentDetails.set({ high: 3, mid: 4, low: 5 });
    dashboardDetails.set({
      summary: { high: 3, mid: 4, low: 5 },
      priorityAssessments: [],
      recentAssessments: [],
    });
    fixture.detectChanges();

    const metricValues = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.metric-card > strong'),
    ).map((element) => element.textContent?.trim());

    expect(metricValues).toEqual(['12', '--', '3', '--']);
  });

  it('presents the Nata assistant as a disabled coming feature', () => {
    const card = (fixture.nativeElement as HTMLElement).querySelector('.assistant-card')!;
    const controls = card.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button');

    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.textContent).toContain('Coming soon');
    expect(Array.from(controls).every((control) => control.disabled)).toBe(true);
  });
});
