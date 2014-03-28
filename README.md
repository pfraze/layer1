# Layer1 (working title) iteration 1


## Interaction Design

The overall inspiration comes from the RTS genre.

### Keystrokes (hotkeys)

Since keyboard combinations (ctrl+, alt+, etc) are mostly taken in the browser, all keyboard interactions are single-key or key-combos. The escape key cancels a combination.

The keystrokes move through a menu which is visible in the persistent panels.

### Agent space

Layer1 is a flat space, with the user looking directly "down" at items which are oriented directly "up."

 - Moving the camera: mouse at screen edges, arrow keys
 - Zooming the camera: mouse-wheel

#### Layers

The radial space is segmented into spherical layers, with each layer providing a different interaction-space. An agent's position in the world is three-dimensional, but the X and Y axis indicate position on the layer's surface (in radians) while the Z axis indicates the current layer. Z, therefore, is a positive integer-space, with 1 representing the closest layer. Agents can move between layers, but can not exist between them.

The camera can only "focus" on one layer at a time. Other layers drop in opacity.

 - Focusing the camera: ctrl+mouse-wheel, page up/down

#### Rendering

For iteration 1, three.js' CSS3D renderer will be used. Most of Layer1 is media-based and will involve GUI elements (text inputs, buttons) so CSS3D lets it take advantage of HTML. Note, however, HTML **should not be exposed to the Layer1 components** to avoid creating a hard dependency.

Level-of-detail is applied to agents, reducing them to shape and icon at certain distance. When close enough, the agent's media is rendered, allowing the user to zoom into its content.

### Agent control

Agents are selectable and can be grouped.

Agents move at different speeds depending on their type. This is to help the user visualize the flow of the system and the "character" of the agent types. To place an agent instantly, the user can teleport.

 - Selecting an agent: left-click
 - Selecting agents: left-click drag
 - Selecting a group of agents: <number_key>
 - Creating a group of agents: c,g,<number_key>
 - Default manipulation command (move): right-click
 - Secondary manipulation command (teleport): double-right-click
 - Default interaction command (contextual): right-click

### Audio signals

[timbre.js](http://mohayonao.github.io/timbre.js/) will be used to generate tones and chords in realtime. Agent and environment state will be reflected in the audio layer using melodic intervals and chord shapes. For instance, normal function is a major chord, while an error condition might be indicated with a diminished7. Types of state will be differentiated by tone shape and pitch-range (eg low bassy grunge for a system component, high thin tones for a helper component).

### Persistent panel interface

Across the bottom of the screen is a panel of persistent and contextual interfaces ([reference](http://static.giantbomb.com/uploads/original/0/1468/184087-starcraft.png)). Available commands and state information about the selected agent is listed. If multiple agents are selected, a condensed view of each is shown as a group of items, and clicking one selects that agent.



## Agent System

### Services architecture

Layer1 manipulates services, and is geared toward generating HTTP-style flows and interactions.

### Agents

Agents are representations of remote state which possess

 1. an address to the endpoint which exposes the state
 2. a typed hypermedia index which includes an entry for its own endpoint and for related endpoints
 3. accumulated local state
 4. a command-set which includes local-space manipulation, local-space interactions, and remote methods

The behaviors and available command-set are determined by the agent type.

Conceptually, agents are similar to cursors in a text buffer. They represent a position in a state-space, and pass commands on to the maintainer of that state in order to produce effects. In editors, a text-cursor passes the keystrokes as commands. In Layer1, the commands are chosen from menus, hotkeys, and contextual clicks, and are carried with HTTP messages.

### Spawning agents

Agents are spawned from links possessed by other agents (their indexes). This is done by scanning the index and selecting a link which is then used to generate the new agent. Immediately on creation, the agent sends a HEAD request for its own index.

The agent exists in a "pre-constructed" state until the initial HEAD response arrives. In that state, the link used for creation acts as its index, but with minimal authority (as the link is not canonical). The waiting period for the response is its "construction" period.

The Layer1 client maintains a set of index queries for its known agent types. The matches against an agent's index are used to populate the menu of spawnable agents.

Agents may be spawned from another agent's "self" link, which is called "cloning."

### Agent types

Every agent has a type which is selected at creation. Agents are polymorphic, meaning they can change between active types after creation. However, types do not combine - only one may apply at a time.

Each type has a definition document which is readable by the Layer1 client. They include:

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

Note that "remote" in Layer1 refers to any component which is not in the Layer1 VM. This means, for instance, a Worker thread is considered "remote." The term is specifically used to mean any state which is not contained in Layer1's memory-space, and so is not manipulable without a network operation.



## Scratch / Ideas / Questions

### An HCI framework?

Layer1 can have many different applications. Is it better to treat it as a framework for applications, or should it be a single tool in which each application is possible? If the latter, then are the applications different visual modes?