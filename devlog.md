/ Mar29 2014 - trying agent services
Is it really almost april? gonna need another job soon
Putting agent behaviors in services so that they can be defined over the network
Many things still document-driven - for instance, menudocs for commandset, which is GETed and interpretted, not unlike HTML forms
But Layer1 is a thin-client, and maps its flows to sending requests to agents
Agents then send requests on to their encapsulated endpoint
For fixed behaviors, a base-agent proxy sits in front of the agent-type's service
We'll see how well this works
\ pfraze


/ Mar28 2014 - agent content shrunk inside
Experimented with fitting content within small box, first by css3d scale, then by zooming content back within the
Neither worked well
Scaling aliased, zooming had alignment issues due to perspective
Note, to zoom back, parent must have -webkit-transform-style: preserve-3d
\ pfraze