import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RumorSimulationComponent} from "./pages/rumor-simulation/rumor-simulation.component";

const routes: Routes = [
  {path: '', component: RumorSimulationComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
