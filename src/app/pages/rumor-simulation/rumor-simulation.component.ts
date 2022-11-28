import { AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import {Link, Simulation, SimulationStep, Node, SimulationCampaign, CampaignResult} from "./Simulation";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";


export interface InformationTypeSelectOption {
  value: string;
  key: 'push' | 'pull' | 'both';
}


@Component({
  selector: 'app-rumor-simulation',
  templateUrl: './rumor-simulation.component.html',
  styleUrls: ['./rumor-simulation.component.scss']
})
export class RumorSimulationComponent implements OnInit, AfterViewInit {

  @ViewChild('svgContainer', {static: true}) svgContainer?: ElementRef;

  private height: number = 0;
  private width: number = 0;

  private svg?: any;
  private nodes?: any;
  private links?: any;
  private zoom?: any;
  private mainGroup?: any;
  private d3Simulation: any

  public typeSelectOption: InformationTypeSelectOption[] = [
    {key: 'pull', value: 'Pull'},
    {key: 'both', value: 'Both'},
    {key: 'push', value: 'Push'}
  ];
  public selectedType?: InformationTypeSelectOption =this.typeSelectOption[0];

  public simulationResult: SimulationStep[] = [];

  public simulation?: Simulation;

  public simulationCampaign?: SimulationCampaign;
  public campaignRunning: boolean = false;
  public currentCampaignResult?: CampaignResult;

  public selectedStep?: SimulationStep;
  private selectedStepAndBelow: boolean = true;

  formGroup: FormGroup;
  formGroup2: FormGroup;

  constructor(private fb: FormBuilder) {
    this.formGroup = this.fb.group({
      'amount': new FormControl(1000, [Validators.required]),
      'informationMethod': new FormControl('pull', [Validators.required])
    })

    this.formGroup2 = this.fb.group({
      'amount': new FormControl(1000, [Validators.required]),
      'informationMethod': new FormControl('pull', [Validators.required]),
      'tries': new FormControl(1000, [Validators.required])
    })
  }

  ngOnInit(): void {
    this.formGroup.valueChanges.subscribe(value => {
      console.log(value);
    })
  }

  ngAfterViewInit(): void {
    const {height, width} = this.svgContainer?.nativeElement?.getBoundingClientRect()
    this.height = height;
    this.width = width;
    this.createSvg();
  }
  private handleZoom(e: any) {
    d3.select('.zoom-group')
      .attr('transform', e.transform);
  }

  private createSvg() {
    this.svg = d3.select('figure#network')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
   const zoom = d3.zoom()
      .on('zoom', this.handleZoom);
   this.svg.call(zoom);
    this.zoom = this.svg.append('g').attr('class', 'zoom-group')
    this.links = this.zoom.append('g').attr('class', 'links-group')
    this.nodes = this.zoom.append('g').attr('class', 'nodes-group')
    this.d3Simulation = d3.forceSimulation()
      .force("x",d3.forceX(this.width/2).strength(0.4))
      .force("y",d3.forceY(this.height/2).strength(0.6))
      .force("charge",d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('link', d3.forceLink().id((node: any) => node.id).strength(1))

  }



  private updateNodes(nodes: Node[], radius: number) {
    this.nodes
      .selectAll('circle')
      .data(nodes, (node: Node) => node.id)
      .join('circle')
      .attr('fill',(d: Node) =>this.getNodeFill(d))
      .attr('r', radius)
      .attr('cx', (d: any) => {
        return d.x;
      })
      .attr('cy', (d: any) => {
        return d.y;
      });
  }

  private getNodeFill(d: Node) {
    if (this.selectedStep?.informedIds) {
      if (this.selectedStep?.informedIds.indexOf(d.id) !== -1) {
          return 'black';
      }
    }
    return 'gray'
  }

  private updateLinks(links: Link[]) {
    this.links
        .selectAll('line')
        .data(links)
        .join('line')
        .attr("stroke-width", 3)
        .attr("class", (d: Link) => `step-${d.step}`)
        .attr('stroke', (d:Link) => {
          return this.getLineColor(d);
        }).attr('x1', function(d: any) {
          return d.source.x
        })
        .attr('y1', function(d: any) {
          return d.source.y
        })
        .attr('x2', function(d: any) {
          return d.target.x
        })
        .attr('y2', function(d: any) {
          return d.target.y
        });
  }

  private getLineColor(link: Link) {
    if (link.step <= this.selectedStep?.step!) {
      if (!this.selectedStepAndBelow) {
        return (link.step == this.selectedStep?.step) ? link.type === 'push'? '#9400D3': '#ff1493' : 'lightgray';
      } else {
        return link.type === 'push'? '#9400D3': '#ff1493';
      }
    }
    return 'lightgray';
  }

  onStart() {
     if (this.formGroup.valid) {
        const formData = this.formGroup.value;
        this.startSimulation(formData.amount, formData.informationMethod);
     }
  }

  onStartCampaign() {
    if (this.formGroup2.valid) {
      const formData = this.formGroup2.value;
      this.campaignRunning = true;
      this.simulationCampaign = new SimulationCampaign(formData.amount, formData.informationMethod, formData.tries);
      this.simulationCampaign.campaignResult.asObservable().subscribe(result => {
        this.currentCampaignResult = result;
        this.campaignRunning = false;
      });
      this.simulationCampaign.start();
    }
  }


  startSimulation(count: number, informationMethod: 'push' | 'pull' | 'both') {
    this.simulationResult = [];
    this.simulation = new Simulation(count, informationMethod);
    //const d3Simulation = this.d3Simulation(this.width, this.height, 10);
    this.simulation.finished$.subscribe((step: Set<SimulationStep>) => {
      this.simulationResult = [];
      if (step) {
        this.simulationResult.push(...Array.from(step.values()));
        const lastStep = this.simulationResult[this.simulation?.stepCount! - 1]
        this.showStep(this.simulationResult[this.simulation?.stepCount! - 1])
        this.colorStep(lastStep.step);
      }
    })
    this.simulation.start();
  }

  colorStep(n: any) {
    const step = this.simulationResult.find(step => step.step === n);
    if (step) {
      this.selectedStep = step;
      this.d3Simulation.restart();
    }
  }


  showStep(step: SimulationStep) {
    this.d3Simulation.nodes(step?.graph?.nodes).on('tick', () => {
      this.updateLinks(step.graph.links);
      this.updateNodes(step.graph.nodes, 10);
    });
    this.d3Simulation.force('link').links(step?.graph.links)
    this.d3Simulation.alpha(1).restart()
  }

}
