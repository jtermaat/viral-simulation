//TOGGLE THESE TO IMPACT HOW FAST PEOPLE GET INFECTED:
var DEFAULT_MOBILITY = 10;   // Higher means faster movement.
var INFECTION_COEFFICIENT = 0.20;
var VOLATILITY = 20; // Higher = more random movement.

// HOW LONG UNTIL AN INFECTED PERSON (YELLOW) BECOMES CONTAGIOUS (RED)
var MEDIAN_FRAMES_TO_INFECTION = 500;
var RANGE_FRAMES_TO_INFECTION = 250;

// HOW LONG UNTIL A CONTAGIOUS PERSON (RED) RECOVERS (BLUE)
var MEDIAN_FRAMES_TO_RECOVERY = 1000;
var RANGE_FRAMES_TO_RECOVERY = 500;

var X_MIN = 0;
var Y_MIN = 0;
var X_MAX = 1200;
var Y_MAX = 600;

var COLOR_UNINFECTED = "#008800";
var COLOR_INFECTED = "#FFFF00";
var COLOR_CONTAGIOUS = "#FF0000";
var COLOR_RECOVERED = "#0000FF";

var numPeople = 1000;

var currentFrame = 0;
var allPeople = [];
var contagiousPeople = [];

var historicalInfectionCounts = [];
var historicalContagiousCounts = [];
var historicalRecoveredCounts = [];

var effectiveMobility = DEFAULT_MOBILITY * VOLATILITY / 1000;

var allBarriers = [];

// PARTIAL BARS
// verticalBarriers = [
//     {
//         x1: 200, y1: 0, x2: 200, y2: 250, id: 0
//     },
//     {
//         x1: 200, y1: 350, x2: 200, y2: 600, id: 1
//     },
//     {
//         x1: 300, y1: 100, x2: 300, y2: 500, id: 12
//     },
//     {
//         x1: 400, y1: 0, x2: 400, y2: 250, id: 2
//     },
//     {
//         x1: 400, y1: 350, x2: 400, y2: 600, id: 3
//     },
//     {
//         x1: 500, y1: 100, x2: 500, y2: 500, id: 13
//     },
//     {
//         x1: 600, y1: 0, x2: 600, y2: 250, id: 4
//     },
//     {
//         x1: 600, y1: 350, x2: 600, y2: 600, id: 5
//     },
//     {
//         x1: 700, y1: 100, x2: 700, y2: 500, id: 14
//     },
//     {
//         x1: 800, y1: 0, x2: 800, y2: 250, id: 6
//     },
//     {
//         x1: 800, y1: 350, x2: 800, y2: 600, id: 7
//     },
//     {
//         x1: 2, y1: 0, x2: 2, y2: 600, id: 8
//     },
//     {
//         x1: 1198, y1: 0, x2: 1198, y2: 600, id: 9
//     },
//     {
//         x1: 1000, y1: 0, x2: 1000, y2: 250, id: 10
//     },
//     {
//         x1: 1000, y1: 350, x2: 1000, y2: 600, id: 11
//     },
//     {
//         x1: 100, y1: 100, x2: 100, y2: 500, id: 15
//     }
// ];
//
var allBarriers = [
    {
        x1: 0, y1: 2, x2: 1200, y2: 2, id: 0
    },
    {
        x1: 0, y1: 598, x2: 1200, y2: 598, id: 1
    },
    {
        x1: 2, y1: 0, x2: 2, y2: 600, id: 2
    },
    {
        x1: 1198, y1: 0, x2: 1198, y2: 600, id: 3
    }
];
//     {
//         x1: 100, y1: 300, x2: 1100, y2: 300, id: 14
//     }
// ];

var numPeopleInfected = 0;

function begin() {
    createPeople(numPeople);
    drawFractalBarriers(3);
    createProcessingSections();
    startInfections([0]);
    window.setInterval(() => {
        runFrame();
    }, 1000 / 60);
}

function startInfections(infectionIds) {
    allPeople.forEach(function (person) {
        if (infectionIds.indexOf(person.id) !== -1) {
            infect(person);
        }
    })
}

function runFrame() {
    configureProcessingSections();
    allPeople.forEach(function (person) {
        runFramePerson(person);
    });
    allPeople.forEach(function (person) {
        var allLocalContagiousPeople = [];
        var localContagiousPeopleMap = {};
        person.processingSections.forEach(function (section) {
            section.contagiousPeople.forEach(function (contagiousPerson) {
                if (!localContagiousPeopleMap[contagiousPerson.id]) {
                    localContagiousPeopleMap[contagiousPerson.id] = true;
                    allLocalContagiousPeople.push(contagiousPerson);
                }
            });
        });
        exposePersonToPeople(person, allLocalContagiousPeople);
    });
    document.getElementById("canvas").getContext("2d").clearRect(0, 0, X_MAX, Y_MAX);
    allPeople.forEach(function (person) {
        var color = person.recovered ? COLOR_RECOVERED : person.contagious ? COLOR_CONTAGIOUS : person.infected ? COLOR_INFECTED : COLOR_UNINFECTED;
        drawCoordinates(person.x, person.y, color);
    });
    allBarriers.forEach(function (barrier) {
        drawBarrier(barrier);
    });
    drawDrawingLine();
    gatherSummaryInfo();
    currentFrame++;
}

function drawBarrier(barrier) {
    var pointSize = 2;
    var ctx = document.getElementById("canvas").getContext("2d");

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(barrier.x1, barrier.y1);
    ctx.lineTo(barrier.x2, barrier.y2);
    ctx.lineTo(barrier.x2 + 1, barrier.y2 + 1);
    ctx.lineTo(barrier.x1 + 1, barrier.y1 + 1);
    ctx.fill();
}

function drawCoordinates(x, y, color) {
    var pointSize = 3;
    var ctx = document.getElementById("canvas").getContext("2d");

    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2, true);
    ctx.fill();
}

function infect(person) {
    person.infected = true;
    person.infectedFrame = currentFrame;
    var incubationTime = Math.random() * RANGE_FRAMES_TO_INFECTION + (MEDIAN_FRAMES_TO_INFECTION - (RANGE_FRAMES_TO_INFECTION / 2.0));
    var recoveryTime = Math.random() * RANGE_FRAMES_TO_RECOVERY + (MEDIAN_FRAMES_TO_RECOVERY - (RANGE_FRAMES_TO_RECOVERY / 2.0));
    person.contagiousFrame = currentFrame + Math.round(incubationTime);
    person.recoveredFrame = person.contagiousFrame + Math.round(recoveryTime);
}

function createPeople(count) {
    for (var i = 0; i < count; i++) {
        var person = createPerson(i, effectiveMobility);
        allPeople.push(person);
    }
}

function createNewInfectedPerson(x, y) {
    var person = createPerson(allPeople.length, effectiveMobility);
    allPeople.push(person);
    infect(person);
    person.x = x;
    person.y = y;
}

function exposePersonToPeople(person, people) {
    people.forEach(function (thisPerson) {
        if (person !== thisPerson && !person.infected) {
            expose(person, thisPerson);
        }
    });
}

function expose(patient, exposure) {
    if (exposure.contagious) {
        var protectedByBarrier = false;
        var allLocalBarriers = [];
        var localBarriersMap = {};
        exposure.processingSections.forEach(function (processingSection) {
            processingSection.barriers.forEach(function (barrier) {
                if (!localBarriersMap[barrier.id]) {
                    localBarriersMap[barrier.id] = true;
                    allLocalBarriers.push(barrier);
                }
            });
        });
        allLocalBarriers.forEach(function (barrier) {
            if (((exposure.x >= barrier.x1 && patient.x < barrier.x1)
                || (exposure.x < barrier.x1 && patient.x >= barrier.x1))
                && ((patient.y < barrier.y1 && patient.y >= barrier.y2)
                    || (patient.y >= barrier.y1 && patient.y < barrier.y2))) {
                protectedByBarrier = true;
            }
        });
        allLocalBarriers.forEach(function (barrier) {
            if (((exposure.y >= barrier.y1 && patient.y < barrier.y1)
                || (exposure.y < barrier.y1 && patient.y >= barrier.y2))
                && ((patient.x < barrier.x1 && patient.x >= barrier.x2)
                    || (patient.x >= barrier.x1 && patient.x < barrier.x2))) {
                protectedByBarrier = true;
            }
        });

        if (!protectedByBarrier) {
            var distance = Math.sqrt((exposure.x - patient.x) * (exposure.x - patient.x) + (exposure.y - patient.y) * (exposure.y - patient.y));
            if (Math.random() < INFECTION_COEFFICIENT / (Math.pow(2, distance))) {
                exposure.peopleInfected++;
                numPeopleInfected++;
                infect(patient);
            }
        }
    }
}

function createPerson(id, mobility) {
    var person = {};
    person.x = Math.random() * X_MAX;
    if (person.x < 3) {
        person.x = 3;
    }
    if (person.x > X_MAX - 3) {
        person.x = X_MAX - 3;
    }
    person.y = Math.random() * Y_MAX;
    if (person.y < 3) {
        person.y = 3;
    }
    if (person.y > Y_MAX - 3) {
        person.y = Y_MAX - 3;
    }
    person.xVelocity = 0.0;
    person.yVelocity = 0.0;
    person.infected = false;
    person.recovered = false;
    person.contagious = false;
    person.dead = false;
    person.infectedFrame = 0;
    person.contagiousFrame = 0;
    person.recoveredFrame = 0;
    person.deadFrame = 0;
    person.id = id;
    person.mobility = mobility;
    person.processingSections = [];
    return person;
}

function runFramePerson(person) {
    var allLocalBarriers = [];
    var localBarriersMap = {};
    person.processingSections.forEach(function (processingSection) {
        processingSection.barriers.forEach(function (barrier) {
            if (!localBarriersMap[barrier.id]) {
                localBarriersMap[barrier.id] = true;
                allLocalBarriers.push(barrier);
            }
        });
    });
    allLocalBarriers.forEach(function (barrier) {
        if (((person.x + person.xVelocity >= barrier.x1 && person.x < barrier.x1)
            || (person.x + person.xVelocity < barrier.x1 && person.x >= barrier.x1))
            && ((person.y < barrier.y1 && person.y >= barrier.y2)
                || (person.y >= barrier.y1 && person.y < barrier.y2))) {
            person.xVelocity = person.xVelocity * -1;
        }
    });

    allLocalBarriers.forEach(function (barrier) {
        if (((person.y + person.yVelocity >= barrier.y1 && person.y < barrier.y1)
            || (person.y + person.yVelocity < barrier.y1 && person.y >= barrier.y1))
            && ((person.x < barrier.x1 && person.x >= barrier.x2)
                || (person.x >= barrier.x1 && person.x < barrier.x2))) {
            person.yVelocity = person.yVelocity * -1;
        }
    });

    person.x = person.x + person.xVelocity;
    person.y = person.y + person.yVelocity;
    var xMotion = (Math.random() - 0.5) * person.mobility;
    var yMotion = (Math.random() - 0.5) * person.mobility;
    var maxVelocity = person.mobility * 100 / VOLATILITY;
    person.xVelocity = person.xVelocity + xMotion;
    person.yVelocity = person.yVelocity + yMotion;
    if (person.xVelocity > maxVelocity) {
        person.xVelocity = maxVelocity;
    }
    if (person.yVelocity > maxVelocity) {
        person.yVelocity = maxVelocity;
    }
    if (person.yVelocity < (maxVelocity * -1)) {
        person.yVelocity = maxVelocity * -1;
    }
    if (person.xVelocity < (maxVelocity * -1)) {
        person.xVelocity = maxVelocity * -1;
    }
    if (person.infected && currentFrame == person.contagiousFrame) {
        person.contagious = true;
        contagiousPeople.push(person);
    } else if (person.infected && currentFrame == person.recoveredFrame) {
        person.recovered = true;
        person.contagious = false;
        contagiousPeople.splice(contagiousPeople.indexOf(person), 1);
    }

}

// HANDLE PROCESSING IN SPATIAL CHUNKS FOR PERFORMANCE:
var processingSectionSize = 80;
var processingSectionOverlap = 40;
var processingSections = [];

function createProcessingSections() {
    var x = 0;
    var y = 0;

    for (var j = 0; j * (processingSectionSize - processingSectionOverlap) < X_MAX; j++) {
        for (var k = 0; k * (processingSectionSize - processingSectionOverlap) < Y_MAX; k++) {
            var processingSection = {
                left: j * processingSectionSize - j * processingSectionOverlap,
                right: (j + 1) * processingSectionSize - j * processingSectionOverlap,
                top: k * processingSectionSize - k * processingSectionOverlap,
                bottom: (k + 1) * processingSectionSize - k * processingSectionOverlap,
                people: [],
                contagiousPeople: [],
                barriers: []
            };
            processingSections.push(processingSection);
        }
    }
}

function configureProcessingSections() {
    processingSections.forEach(function (section) {
        section.people = [];
        section.contagiousPeople = [];
        section.barriers = [];
    });
    addPeopleToProcessingSections(allPeople, contagiousPeople);
    addBarriersToProcessingSections(allBarriers);
}

function addPeopleToProcessingSections(people, contagiousPeople) {
    people.forEach(function (person) {
        person.processingSections = [];
        processingSections.forEach(function (section) {
            if (person.x >= section.left && person.x < section.right && person.y >= section.top && person.y < section.bottom) {
                section.people.push(person);
                person.processingSections.push(section);
            }
        });
    });
    contagiousPeople.forEach(function (person) {
        person.processingSections.forEach(function (processingSection) {
            processingSection.contagiousPeople.push(person);
        });
    });
}

function addBarriersToProcessingSections(barriers) {
    barriers.forEach(function (barrier) {
        barrier.processingSections = [];
        processingSections.forEach(function (section) {
            if (((barrier.x1 >= section.left && barrier.x1 < section.right)
                || (barrier.x2 >= section.left && barrier.x2 < section.right)
                || (barrier.x1 >= section.left && barrier.x1 >= section.right && barrier.x2 < section.left && barrier.x2 < section.right)
                || (barrier.x1 < section.left && barrier.x1 < section.right && barrier.x2 >= section.left && barrier.x2 >= section.right))
                && ((barrier.y1 >= section.top && barrier.y1 < section.bottom)
                    || (barrier.y2 >= section.top && barrier.y2 < section.bottom)
                    || (barrier.y1 >= section.top && barrier.y1 >= section.bottom && barrier.y2 < section.top && barrier.y2 < section.bottom)
                    || (barrier.y1 < section.top && barrier.y1 < section.bottom && barrier.y2 >= section.top && barrier.y2 >= section.bottom))) {
                section.barriers.push(barrier);
                barrier.processingSections.push(section);
            }
        });
    });
}

// SUMMARY INFO
function gatherSummaryInfo() {
    var uninfectedCount = 0;
    var infectionCount = 0;
    var contagiousCount = 0;
    var recoveredCount = 0;
    allPeople.forEach(function (person) {
        if (person.infected && !person.recovered) {
            infectionCount++;
        }
        if (person.contagious) {
            contagiousCount++;
        }
        if (person.recovered) {
            recoveredCount++;
        }
        if (!person.infected) {
            uninfectedCount++;
        }
    });
    var uninfectedPercent = ((uninfectedCount / numPeople).toFixed(3) * 100).toFixed(1) + '%';
    var infectionPercent = ((infectionCount / numPeople).toFixed(3) * 100).toFixed(1) + '%';
    var contagiousPercent = ((contagiousCount / numPeople).toFixed(3) * 100).toFixed(1) + '%';
    var recoveredPercent = ((recoveredCount / numPeople).toFixed(3) * 100).toFixed(1) + '%';
    historicalInfectionCounts.push(infectionCount);
    historicalContagiousCounts.push(contagiousCount);
    historicalRecoveredCounts.push(recoveredCount);
    document.getElementById('uninfected-count').innerText = uninfectedCount;
    document.getElementById('infected-count').innerText = infectionCount;
    document.getElementById('contagious-count').innerText = contagiousCount;
    document.getElementById('recovered-count').innerText = recoveredCount;
    document.getElementById('uninfected-percent').innerText = uninfectedPercent;
    document.getElementById('infected-percent').innerText = infectionPercent;
    document.getElementById('contagious-percent').innerText = contagiousPercent;
    document.getElementById('recovered-percent').innerText = recoveredPercent;
}

// MOUSE EVENTS
var mouseDown = {};
var mouseCurrent = {};
var mouseLast = {};

function drawDrawingLine() {
    if (mouseDown.x && mouseCurrent.x && getDrawType() === 'drawBarrier') {
        var pointSize = 2;
        var ctx = document.getElementById("canvas").getContext("2d");

        ctx.fillStyle = '#888888';

        var xDiff = Math.abs(mouseCurrent.x - mouseDown.x);
        var yDiff = Math.abs(mouseCurrent.y - mouseDown.y);
        var barrier;
        if (xDiff < yDiff) {
            barrier = {x1: mouseDown.x, y1: mouseDown.y, x2: mouseDown.x, y2: mouseCurrent.y};
        } else {
            barrier = {x1: mouseDown.x, y1: mouseDown.y, x2: mouseCurrent.x, y2: mouseDown.y};
        }
        ctx.beginPath();
        ctx.moveTo(barrier.x1, barrier.y1);
        ctx.lineTo(barrier.x2, barrier.y2);
        ctx.lineTo(barrier.x2 + 1, barrier.y2 + 1);
        ctx.lineTo(barrier.x1 + 1, barrier.y1 + 1);
        ctx.fill();
    }
}

function getDrawType() {
    if ($('#checkboxDrawBarrier')[0].checked) {
        return 'drawBarrier';
    } else if ($('#checkboxEraseBarrier')[0].checked) {
        return 'eraseBarrier';
    } else {
        return 'drawInfected';
    }
}

$(document).ready(function () {
    document.getElementById('canvas').addEventListener("mousedown", function (e) {
        if (getDrawType() === 'drawInfected') {
            createNewInfectedPerson(e.offsetX, e.offsetY);
        }
        mouseDown = {x: e.offsetX, y: e.offsetY};
    });

    document.getElementById('canvas').onmousemove = function (e) {
        mouseLast = mouseCurrent;
        mouseCurrent = {x: e.offsetX, y: e.offsetY};
        var barriersToRemove = [];
        if (getDrawType() === 'eraseBarrier' && mouseDown.x) {
            allBarriers.forEach(function (barrier) {
                if (((mouseCurrent.x >= barrier.x1 && mouseLast.x < barrier.x1)
                    || (mouseCurrent.x < barrier.x1 && mouseLast.x >= barrier.x1))
                    && ((mouseLast.y < barrier.y1 && mouseLast.y >= barrier.y2)
                        || (mouseLast.y >= barrier.y1 && mouseLast.y < barrier.y2))) {
                    barriersToRemove.push(barrier);
                }
                if (((mouseCurrent.y >= barrier.y1 && mouseLast.y < barrier.y1)
                    || (mouseCurrent.y < barrier.y1 && mouseLast.y >= barrier.y1))
                    && ((mouseLast.x < barrier.x1 && mouseLast.x >= barrier.x2)
                        || (mouseLast.x >= barrier.x1 && mouseLast.x < barrier.x2))) {
                    barriersToRemove.push(barrier);
                }
            });
            barriersToRemove.forEach(function(barrier) {
               allBarriers.splice(allBarriers.indexOf(barrier), 1);
            });
        }
    }

    function balanceBarrier(barrier) {
        if (barrier.x2 < barrier.x1) {
            var temp = barrier.x1;
            barrier.x1 = barrier.x2;
            barrier.x2 = temp;
        }
        if (barrier.y2 < barrier.y1) {
            var temp = barrier.y1;
            barrier.y1 = barrier.y2;
            barrier.y2 = temp;
        }
    }

    document.getElementById('canvas').addEventListener("mouseup", function (e) {
        if (getDrawType() === 'drawBarrier' && mouseDown.x) {
            var xDiff = Math.abs(mouseCurrent.x - mouseDown.x);
            var yDiff = Math.abs(mouseCurrent.y - mouseDown.y);
            if (xDiff < yDiff) {
                var barrier = {x1: mouseDown.x, y1: mouseDown.y, x2: mouseDown.x, y2: mouseCurrent.y, id: currentFrame};
                balanceBarrier(barrier);
                allBarriers.push(barrier);
            } else {
                var barrier = {x1: mouseDown.x, y1: mouseDown.y, x2: mouseCurrent.x, y2: mouseDown.y, id: currentFrame};
                balanceBarrier(barrier);
                allBarriers.push(barrier);
            }
        }
        mouseDown = {};
        mouseCurrent = {};
        mouseLast = {};
    });

    $( "#infectious-slider" ).slider();
    $( "#mobility-slider" ).slider();
    $( "#volatility-slider" ).slider();
    begin();
});

function drawFractalBarriers(level) {
    drawFractalBarrierForArea(level, 50, 50, 575, 550, fractalPatternBasic, 'random');
    drawFractalBarrierForArea(level, 50, 625, 1150, 550, fractalPatternBasic, 'random');
}

function drawFractalBarrierForArea(level, top, left, right, bottom, fractalPattern, direction) {
    if (direction === 'random') {
        var rand = Math.random();
        if (rand < 0.25) {
            direction = 'left';
        } else if (rand < 0.5) {
            direction = 'right';
        } else if (rand < 0.75) {
            direction = 'up';
        } else {
            direction = 'down';
        }
    }
    var partBarriers = fractalPattern[direction].barriers;
    var partChildren = fractalPattern[direction].children;
    var width = right - left;
    var height = bottom - top;
    partBarriers.forEach(function (barrier) {
        var outBarrier = {};
        outBarrier.x1 = barrier.x1 / 100 * width + left;
        outBarrier.x2 = barrier.x2 / 100 * width + left;
        outBarrier.y1 = barrier.y1 / 100 * height + top;
        outBarrier.y2 = barrier.y2 / 100 * height + top;
        var id = allBarriers.length;
        outBarrier.id = id;
        allBarriers.push(outBarrier);
    });
    partChildren.forEach(function (child) {
        var absoluteTop = top + height * child.top / 100;
        var absoluteLeft = left + width * child.left / 100;
        var absoluteBottom = top + height * child.bottom / 100;
        var absoluteRight = left + width * child.right / 100;
        if (level > 1) {
            drawFractalBarrierForArea(level - 1, absoluteTop, absoluteLeft, absoluteRight, absoluteBottom, fractalPattern, child.direction);
        }
    })
}

var fractalPatternBasic = {
    name: 'Basic Fractal',
    up: {
        barriers: [
            {x1: 0, y1: 0, x2: 60, y2: 0},
            {x1: 100, y1: 40, x2: 100, y2: 100},
            {x1: 100, y1: 100, x2: 0, y2: 100},
            {x1: 0, y1: 100, x2: 0, y2: 0}
        ],
        children: [
            {top: 7, left: 7, bottom: 32, right: 32, direction: 'random'},
            {top: 37, left: 7, bottom: 62, right: 32, direction: 'random'},
            {top: 67, left: 7, bottom: 92, right: 32, direction: 'random'},
            {top: 7, left: 37, bottom: 32, right: 62, direction: 'random'},
            {top: 37, left: 37, bottom: 62, right: 62, direction: 'random'},
            {top: 67, left: 37, bottom: 92, right: 62, direction: 'random'},
            {top: 7, left: 67, bottom: 32, right: 92, direction: 'random'},
            {top: 37, left: 67, bottom: 62, right: 92, direction: 'random'},
            {top: 67, left: 67, bottom: 92, right: 92, direction: 'random'}
        ]
    },
    down: {
        barriers: [
            {x1: 0, y1: 0, x2: 100, y2: 0},
            {x1: 100, y1: 0, x2: 100, y2: 100},
            {x1: 100, y1: 100, x2: 40, y2: 100},
            {x1: 0, y1: 60, x2: 0, y2: 0}
        ],
        children: [
            {top: 7, left: 7, bottom: 32, right: 32, direction: 'random'},
            {top: 37, left: 7, bottom: 62, right: 32, direction: 'random'},
            {top: 67, left: 7, bottom: 92, right: 32, direction: 'random'},
            {top: 7, left: 37, bottom: 32, right: 62, direction: 'random'},
            {top: 37, left: 37, bottom: 62, right: 62, direction: 'random'},
            {top: 67, left: 37, bottom: 92, right: 62, direction: 'random'},
            {top: 7, left: 67, bottom: 32, right: 92, direction: 'random'},
            {top: 37, left: 67, bottom: 62, right: 92, direction: 'random'},
            {top: 67, left: 67, bottom: 92, right: 92, direction: 'random'}
        ]
    },
    left: {
        barriers: [
            {x1: 0, y1: 0, x2: 100, y2: 0},
            {x1: 100, y1: 0, x2: 100, y2: 60},
            {x1: 60, y1: 100, x2: 0, y2: 100},
            {x1: 0, y1: 100, x2: 0, y2: 0}
        ],
        children: [
            {top: 7, left: 7, bottom: 32, right: 32, direction: 'random'},
            {top: 37, left: 7, bottom: 62, right: 32, direction: 'random'},
            {top: 67, left: 7, bottom: 92, right: 32, direction: 'random'},
            {top: 7, left: 37, bottom: 32, right: 62, direction: 'random'},
            {top: 37, left: 37, bottom: 62, right: 62, direction: 'random'},
            {top: 67, left: 37, bottom: 92, right: 62, direction: 'random'},
            {top: 7, left: 67, bottom: 32, right: 92, direction: 'random'},
            {top: 37, left: 67, bottom: 62, right: 92, direction: 'random'},
            {top: 67, left: 67, bottom: 92, right: 92, direction: 'random'}
        ]
    },
    right: {
        barriers: [
            {x1: 40, y1: 0, x2: 100, y2: 0},
            {x1: 100, y1: 0, x2: 100, y2: 100},
            {x1: 100, y1: 100, x2: 0, y2: 100},
            {x1: 0, y1: 100, x2: 0, y2: 40}
        ],
        children: [
            {top: 7, left: 7, bottom: 32, right: 32, direction: 'random'},
            {top: 37, left: 7, bottom: 62, right: 32, direction: 'random'},
            {top: 67, left: 7, bottom: 92, right: 32, direction: 'random'},
            {top: 7, left: 37, bottom: 32, right: 62, direction: 'random'},
            {top: 37, left: 37, bottom: 62, right: 62, direction: 'random'},
            {top: 67, left: 37, bottom: 92, right: 62, direction: 'random'},
            {top: 7, left: 67, bottom: 32, right: 92, direction: 'random'},
            {top: 37, left: 67, bottom: 62, right: 92, direction: 'random'},
            {top: 67, left: 67, bottom: 92, right: 92, direction: 'random'}
        ]
    }

}

