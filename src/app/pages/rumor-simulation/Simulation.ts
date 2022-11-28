import {BehaviorSubject, Subject} from "rxjs";
import {SimulationLinkDatum, SimulationNodeDatum} from "d3";

export interface Node extends SimulationNodeDatum {
  id: number;
  informed: boolean
}

export interface Link extends SimulationLinkDatum<Node> {
  id: string;
  step: number;
  type: 'push' | 'pull'
}

export interface SimulationGraph {
  nodes: Node[],
  links: Link[],
}

export interface SimulationStep {
  step: number;
  graph: SimulationGraph;
  informed: number;
  informedIds: number[];
  time: number;
  end: boolean;
}

export interface CampaignResult {
  avgSteps: number;
  avgTime: number;
}

export class SimulationCampaign {

  public campaignResult: BehaviorSubject<CampaignResult> = new BehaviorSubject<CampaignResult>({avgSteps: 0, avgTime: 0});

  progress: number = 0;

  avgSteps: number = 0;
  avgTime: number = 0;

  estimatedTime: number = 0;

  getProgress() {
    return (this.progress / this.retries)*100;
  }

  constructor(public nodeAmount: number,
              public informationMethod: 'push' | 'pull' | 'both',
              public retries: number) {
  }

  start() {
    for (let i = 0; i < this.retries; i++) {
      this.runSimulation()
    }

  }

  runSimulation() {
    const simulation = new Simulation(this.nodeAmount, this.informationMethod);
    simulation.finished$.subscribe(steps => {
      this.progress += 1;
      this.avgSteps += steps.size / this.retries;
      this.avgTime += Array.from(steps.values()).reduce((p, c) => p + c.time, 0) / this.retries;
      this.estimatedTime += this.avgTime * (this.retries - this.progress)
      this.campaignResult.next({avgSteps: this.avgSteps, avgTime: this.avgTime});
    });
    simulation.start();
  }
}


export class Simulation {
  private simulationSteps: Set<SimulationStep> = new Set();
  private stepSubject: BehaviorSubject<SimulationStep | undefined> = new BehaviorSubject<SimulationStep | undefined>(undefined);
  private simulationFinishedSubject: Subject<Set<SimulationStep>> = new Subject<Set<SimulationStep>>();

  private nodes: Map<number, Node> = new Map<number, Node>();
  private links: Map<string, Link> = new Map<string, Link>();

  private informedCount = 0;

  public stepCount = 0;

  private method: 'push' | 'pull' | 'both';

  constructor(nodeAmount: number, informationMethod: 'push' | 'pull' | 'both') {
    this.generateNotes(nodeAmount).forEach(n => this.nodes.set(n.id, n));
    this.method = informationMethod;
  }

  private generateNotes(amount: number): Node[] {
    const result: Node[] = [];
    for (let count = 0; count < amount; count++) {
      result.push({id: count, informed: false})
    }
    result[Math.floor(Math.random() * result.length)].informed = true;
    return result;
  }

  public step() {
    this.stepCount += 1;
    const startTime = new Date().getTime();
    const addedLinks: Link[] = [];
    for (let node of this.nodes.values()) {
      //console.log(node);
      const calledNode = this.chooseRandomNode();
      // console.log(calledNode.id);
      const type = this.getInformationTypeForNodes(node, calledNode);
      if (type !== undefined) {
        const newLinkId = Simulation.generateLinkIdForCall(node, calledNode);
        const newLink: Link = {source: node.id, target: calledNode.id, type, id: newLinkId, step: this.stepCount};
        if (this.method === 'both') {
          // set new Link
          this.links.set(newLinkId, newLink);
          addedLinks.push(newLink)
        } else {
          if (this.method === 'push' && type === 'push') {
            // set new Link
            this.links.set(newLinkId, newLink);
            addedLinks.push(newLink)
          } else if (this.method === 'pull' && type === 'pull') {
            // set new Link
            this.links.set(newLinkId, newLink);
            addedLinks.push(newLink)
          }
        }
      }
    }
    for (let link of addedLinks) {
      const source = this.nodes.get(link.source as number)!;
      const target = this.nodes.get(link.target as number)!;
      source.informed = true;
      target.informed = true;
      this.nodes.set(source.id, source);
      this.nodes.set(target.id, target);
    }

    let informedIds: number[] = [];
    Array.from(this.nodes.values()).forEach(el => {
      if (el.informed) {
        informedIds.push(el.id);
      }
    })
    const endTime = new Date().getTime();
    const simulationStep: SimulationStep = {
      step: this.stepCount,
      informed: informedIds.length,
      informedIds: informedIds,
      graph: {
        nodes: Array.from(this.nodes.values()),
        links: Array.from(this.links.values())
      },
      time: endTime - startTime,
      end: this.nodes.size === informedIds.length
    }
    this.simulationSteps.add(simulationStep);
    this.stepSubject.next(simulationStep);
  }

  start() {
    this.stepSubject.asObservable().subscribe((step: SimulationStep | undefined) => {
      if (step) {
        if (!step.end) {
          this.step();
        } else {
          this.simulationFinishedSubject.next(this.simulationSteps);
        }
      }
    });
    this.step();
  }

  static generateLinkIdForCall(n1: Node, n2: Node) {
    return `${n1.id}|${n2.id}`;
  }

  private getInformationTypeForNodes(n1: Node, n2: Node): 'push' | 'pull' | undefined {
    if (n1.informed && !n2.informed) {
      return 'push';
    } else if (!n1.informed && n2.informed) {
      return 'pull';
    }
    return undefined;
  }

  private chooseRandomNode(): Node {
    return this.nodes.get(Math.floor(Math.random() * this.nodes.size))!;
  }

  get finished$() {
    return this.simulationFinishedSubject.asObservable();
  }

  get step$() {
    return this.stepSubject.asObservable();
  }
}

