# Gamespace (working title) iteration 1


## Interaction Design


### Radial space

Gamespace is radial, with the user at center and the agents orbiting. Moving up/down/left/right in the view rotates the camera from 0,0,0.

 - Moving the camera: mouse at screen edges, arrow keys
 - Zooming the camera: mouse-wheel


### Layers

The radial space is segmented into spherical layers, with each layer providing a different interaction-space. An agent's position in the world is three-dimensional, but the X and Y axis indicate position on the layer's surface (in radians) while the Z axis indicates the current layer. Z, therefore, is a positive integer-space, with 1 representing the closest layer. Agents can move between layers, but can not exist between them.

The camera can only "focus" on one layer at a time. Other layers drop in opacity.

 - Focusing the camera: ctrl+mouse-wheel, page up/down


### Services architecture

Gamespace manipulates services, and is geared toward generating HTTP-style flows and interactions.


### Agents

Agents are representations of remote state which possess

 1. an address to the endpoint which exposes the state
 2. a typed hypermedia index which includes an entry for its own endpoint and for related endpoints
 3. accumulated local state
 4. a command-set which includes local-space manipulation, local-space interactions, and remote methods

The behaviors and available command-set are determined by the agent type.

Conceptually, agents are similar to cursors in a text buffer. They represent a position in a state-space, and pass commands on to the maintainer of that state in order to produce effects. In editors, a text-cursor passes the keystrokes as commands. In Gamespace, the commands are chosen from menus, hotkeys, and contextual clicks, and are carried with HTTP messages.


### Spawning agents

Agents are spawned from links possessed by other agents (their indexes). This is done by scanning the index and selecting a link which is then used to generate the new agent. Immediately on creation, the agent sends a HEAD request for its own index.

The agent exists in a "pre-constructed" state until the initial HEAD response arrives. In that state, the link used for creation acts as its index, but with minimal authority (as the link is not canonical). The waiting period for the response is its "construction" period.

The Gamespace client maintains a set of index queries for its known agent types. The matches against an agent's index are used to populate the menu of spawnable agents.

Agents may be spawned from another agent's "self" link, which is called "cloning."


### Agent types

Every agent has a type which is selected at creation. Agents are polymorphic, meaning they can change between active types after creation. However, types do not combine - only one may apply at a time.

Each type has a definition document which is readable by the Gamespace client. They include:

 - Index queries for spawning agents of the type
 - Any non-standard commands
 - Rendering behaviors
 - Interaction/reaction behaviors


### Agent command-sets

#### Local-space manipulation

Local-space manipulation commands are actions which can be taken on the agent without involving another agent. This includes repositioning the agent, viewing/editing the stored state, spawning new agents, and rebasing or retyping the agent.

#### Local-space interactions

Local-space interaction commands are actions which involve another agent. This includes modifying or copying state to the target agent, using a remote method of the target, or triggering reaction behaviors.

Reaction behaviors are commands defined by the target agent's type which are executed before, with, or after the interaction. Their definition includes a trigger condition and the commands to execute.

#### Remote methods

Remote-method commands can only interact with the agent's endpoint. An agent can change its endpoint (called a "rebase") but it's unusual to do so: rather, a new agent is typically created for the new endpoint.

The available methods are determined by whats known through the agent's self reltype. Other methods may be attempted manually (potentially with assistance by an OPTIONS request). Agents may send their data to another end-point via another agent (see "local-space interactions").

Note that "remote" in Gamespace refers to any component which is not in the Gamespace VM. This means, for instance, a Worker thread is considered "remote." The term is specifically used to mean any state which is not contained in Gamespace's memory-space, and so is not manipulable without a network operation.



## Scratch / Ideas / Questions

### An HCI framework?

Gamespace can have many different applications. Is it better to treat it as a framework for applications, or should it be a single tool in which each application is possible? If the latter, then are the applications different visual modes?