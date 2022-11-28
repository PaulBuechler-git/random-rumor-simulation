import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RumorSimulationComponent } from './rumor-simulation.component';

describe('RumorSimulationComponent', () => {
  let component: RumorSimulationComponent;
  let fixture: ComponentFixture<RumorSimulationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RumorSimulationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RumorSimulationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
