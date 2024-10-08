const groups = require('./groups.json');
const exibitions = require('./exibitions.json');

function initialize_teamResults(teamResults, groups){
    for(groupName in groups){
        groups[groupName].forEach(team => {
            teamResults[team.Team] = [];
        });
    }
}

function initialize_forms(){
    forms = {};

    for(teamCode in exibitions){
        let score = exibitions[teamCode][0].Result.split("-");
        let form = score[0] - score[1];

        score = exibitions[teamCode][1].Result.split("-");
        form += score[0] - score[1];

        forms[teamCode] = form;
    }
    return forms;
}

function getPoints(probFactor, pointFactor){
    return 75 + Math.ceil((Math.random() + probFactor) * pointFactor);
}

function getResult(team1, code1, team2, code2, teamForms, diff, worstRanking, teamResults, round){
    let surrender = false;
    let winner = 0;
    let points1;
    let points2;
    if(Math.random() < 0.01){
        surrender = true;
        if (Math.random() > 0.5){
            winner = 2;
            //U kosarci u slucaju predaje 20 : 0 je rez
            points1 = 0;
            points2 = 20;
            console.log("       "+team1+" predao.");
        }
        else{
            winner = 1;
            points1 = 20;
            points2 = 0;
            console.log("       "+team2+" predao.");
        }
    }
    else{
        //probFactor je u inverznoj relaciji sa razlikom
        let probFactor = -diff/worstRanking*0.3 + 
        (teamForms[code1] - teamForms[code2])/
        (Math.abs(teamForms[code1]) + Math.abs(teamForms[code2])) * 0.2;

        points1 = getPoints(probFactor, 25);
        points2 = getPoints(-probFactor, 25);

        //no ties
        if(points1 == points2){
            points1 += 1;
        }

        //sto je protivnik jaci to vise doprinosi formi u slucaju pobede
        let strengthFactor1 = 0.5 - diff / (worstRanking*2);
        let strengthFactor2 = 0.5 + diff / (worstRanking*2);

        //u slucaju poraza jacina protivnika smanjuje pad forme
        strengthFactor1 = points1 - points2 > 0 ? strengthFactor1 : 1-strengthFactor1;
        strengthFactor2 = points2 - points1 > 0 ? strengthFactor2 : 1-strengthFactor2;

        //forma sve vise doprinosi kako imamo vise utakmica za uzorak
        teamForms[code1] += strengthFactor1 * (points1 - points2);
        teamForms[code2] += strengthFactor2 * (points2 - points1);

        winner = points1 - points2 > 0 ? 1 : 2;
        console.log("       "+team1+" - "+team2+" (" + points1 + " : " + points2 + ")");
    }

    teamResults[team1][round-1] ={ opponent : team2,
                                  win : winner == 1 ? true : false,
                                  surrender : winner == 1 ? false : surrender,
                                  ptsScored : points1,
                                  ptsOpp : points2};

    teamResults[team2][round-1] = { opponent : team1,
                                  win : winner == 2 ? true : false,
                                  surrender : winner == 2 ? false : surrender,
                                  ptsScored : points2,
                                  ptsOpp : points1};
}

function groupRankings(teamResults, rounds){
    let teamCounter = 0;
    let groupId = 0;
    groupResults = [[], [], []];
    for (team in teamResults){
        if(teamCounter == 4){
            teamCounter = 0;
            groupId++;
        }
        let points = 0;
        groupResults[groupId][teamCounter] = {team : team,
                                              points : 0,
                                              ptsScoredSum : 0,
                                              ptsOppSum : 0,
                                              wins : 0, 
                                              losses : 0,
                                              priority : 0}
        for(let j = 0; j < rounds; j++){
            let matchResults = teamResults[team][j];
            points += matchResults.win ? 2 : (matchResults.surrender ? 0 : 1);
            groupResults[groupId][teamCounter][matchResults.opponent] = 
                                matchResults.ptsScored - matchResults.ptsOpp;
            groupResults[groupId][teamCounter].ptsScoredSum += matchResults.ptsScored;
            groupResults[groupId][teamCounter].ptsOppSum += matchResults.ptsOpp;
            groupResults[groupId][teamCounter].wins += matchResults.win ? 1 : 0;
            groupResults[groupId][teamCounter].losses += matchResults.win ? 0 : 1;
        }
        groupResults[groupId][teamCounter].points = points;
        teamCounter++;
    }
    
    //sortiraj po poenima
    for (let i = 0; i < groupResults.length; i++){
        groupResults[i].sort((team1, team2) => (team1.points > team2.points) ? -1 : 1);
    }

    for (let i = 0; i < groupResults.length; i++){
        let j = 0;
        while (j < groupResults[i].length-1){
            let k = j;
            let team0 = -1;
            //dok god timovi imaju isti broj bodova ažuriraj međusobnu koš razliku
            while(groupResults[i][k].points == groupResults[i][++k].points){
                let team1 = groupResults[i][k-1];
                let team2 = groupResults[i][k];

                team1.priority += team1[team2.team];
                team2.priority += team2[team1.team];

                if (team0 != -1){
                    team0.priority += team0[team2.team];
                    team2.priority += team2[team0.team];
                }

                team0 = team1;

                if(k == groupResults[i].length-1){
                    break;
                }
            }
            j = k;
        }
    }

    for (let i = 0; i < groupResults.length; i++){
        groupResults[i].sort((team1, team2) => (team1.points > team2.points) ? -1 : (team1.points == team2.points) ? ((team1.priority > team2.priority) ? -1 : 1) : 1);
    }

    return groupResults;
}

function draw(teamRangs){
    pairs = {}
    if(Math.random() < 0.5){ //izvuceni 0 i 6
        if(teamRangs[0].group === teamRangs[6].group){
            pairs[1] = [teamRangs[0].team, teamRangs[7].team];
            pairs[3] = [teamRangs[1].team, teamRangs[6].team];
        }
        else{
            pairs[1] = [teamRangs[0].team, teamRangs[6].team];
            pairs[3] = [teamRangs[1].team, teamRangs[7].team];
        }
    }
    else{ //izvuceni 0 i 7
        if(teamRangs[0].group === teamRangs[7].group){
            pairs[1] = [teamRangs[0].team, teamRangs[6].team];
            pairs[3] = [teamRangs[1].team, teamRangs[7].team];
        }
        else{
            pairs[1] = [teamRangs[0].team, teamRangs[7].team];
            pairs[3] = [teamRangs[1].team, teamRangs[6].team];
        }
    }

    if(Math.random() < 0.5){ //izvuceni 2 i 4
        if(teamRangs[2].group === teamRangs[4].group){
            pairs[2] = [teamRangs[2].team, teamRangs[5].team];
            pairs[4] = [teamRangs[3].team, teamRangs[4].team];
        }
        else{
            pairs[2] = [teamRangs[2].team, teamRangs[4].team];
            pairs[4] = [teamRangs[3].team, teamRangs[5].team];
        }
    }
    else{ //izvuceni 2 i 5
        if(teamRangs[2].group === teamRangs[5].group){
            pairs[2] = [teamRangs[2].team, teamRangs[4].team];
            pairs[4] = [teamRangs[3].team, teamRangs[5].team];
        }
        else{
            pairs[2] = [teamRangs[2].team, teamRangs[5].team];
            pairs[4] = [teamRangs[3].team, teamRangs[4].team];
        }
    }

    return pairs;
}

function playElimination(Draw, teamCodeRankingMap, teamForms, worstRanking, teamResults){
    let roundNames = ['cetvrtfinala:', 'polufinala:', 'za 3:', 'za 1:'];
    let semiFinal = false;
    let finalPair = [];
    let first, second, third;
    for (let round = 4; round < 8; round++) {
        if(round === 5){
            semiFinal = true;
        }
        console.log('\nRezultati '+roundNames[round-4])
        let newPair = [];
        let newDraw = {};
        for(pairNum in Draw){
            let pair = Draw[pairNum];
    
            let team1 = pair[0];
            let teamCode1 = teamCodeRankingMap[team1].code;
            let teamRank1 = teamCodeRankingMap[team1].rank;
    
            let team2 = pair[1];
            let teamCode2 = teamCodeRankingMap[team2].code;
            let teamRank2 = teamCodeRankingMap[team2].rank;
    
            getResult(team1, teamCode1, team2, teamCode2, teamForms, 
                         teamRank1 - teamRank2, worstRanking, teamResults, round);
            
            //postavi medlaje
            if(round === 6){
                third = teamResults[team1][round-1].win ? team1 : team2;
            }
            if(round === 7){
                first = teamResults[team1][round-1].win ? team1 : team2;
                second = teamResults[team1][round-1].win ? team2 : team1;
            }

            //ako je ostalo samo finale da se odigra
            if (finalPair.length !== 0 && finalPair.length !== 1){
                newDraw[1] = finalPair;
                continue;
            }
            
            //ako je polufinale uzmi gubitnicki par, a postavi finalni
            if (semiFinal) {
                newPair.push(teamResults[team1][round-1].win ? team2 : team1);
                finalPair.push(teamResults[team1][round-1].win ? team1 : team2);
            } else {
                newPair.push(teamResults[team1][round-1].win ? team1 : team2);
            }

            if (pairNum % 2 === 0){
                newDraw[pairNum / 2] = newPair;
                newPair = [];
            }
            
        }
        semiFinal = false;
        Draw = newDraw;
        console.log('-----------------------------')
    }
    console.log("\n1. "+first);
    console.log("2. "+second);
    console.log("3. "+third);
}

let worstRanking = 0;
for (const groupName in groups){
    //najgori rang na FIBA
    worstRanking = groups[groupName]
                                .reduce((acc, group) => 
                                        {
                                            return (acc = acc > group.FIBARanking ? acc : group.FIBARanking);
                                        }, worstRanking);
}
//broj kola
const rounds = groups.A.length-1;
let teamResults = {};
let teamForms = initialize_forms();
let teamCodeRankingMap = {};
initialize_teamResults(teamResults, groups);
for(let i = 1; i <= rounds; i++){
    console.log("Rezultati "+i+". kola:");
    for (const groupName in groups){
        console.log("   Grupa "+groupName+":" );
        
        let team1 = groups[groupName][0].Team;
        let teamCode1 = groups[groupName][0].ISOCode;
        let teamRanking1 = groups[groupName][0].FIBARanking;

        let team2 = groups[groupName][i].Team;
        let teamCode2 = groups[groupName][i].ISOCode;
        let teamRanking2 = groups[groupName][i].FIBARanking;

        let rankingDiff = teamRanking1 - teamRanking2;
        if(i == 1){ //inicijalizuje se mapa samo na pocetku
            teamCodeRankingMap[team1] = {code : teamCode1, 
                                         rank : teamRanking1};
            teamCodeRankingMap[team2] = {code : teamCode2, 
                                         rank : teamRanking2};
        }
    
        getResult(team1, teamCode1, team2, teamCode2, teamForms, rankingDiff, worstRanking, teamResults, i);

        //igraju 2 i 3, pa 1 i 3, pa 1 i 2
        let j = i - 1 > 0 ? i-1 : 3;
        let k = i + 1 < 4 ? i+1 : 1;
        team1 = groups[groupName][j].Team;
        teamCode1 = groups[groupName][j].ISOCode;
        teamRanking1 = groups[groupName][j].FIBARanking;

        team2 = groups[groupName][k].Team;
        teamCode2 = groups[groupName][k].ISOCode;
        teamRanking2 = groups[groupName][k].FIBARanking;

        rankingDiff = teamRanking1 - teamRanking2;
        if(i == 1){
            teamCodeRankingMap[team1] = {code : teamCode1, 
                                         rank : teamRanking1};
            teamCodeRankingMap[team2] = {code : teamCode2, 
                                         rank : teamRanking2};
        }
        getResult(team1, teamCode1, team2, teamCode2, teamForms, rankingDiff, worstRanking, teamResults, i);
    }
}
const groupStandings = groupRankings(teamResults, rounds);
console.log('Konacan plasman u grupama:');
let groupId = 0;
for(let groupName in groups){
    console.log('   Grupa '+groupName+'(Ime - pobede/porazi/bodovi/postignuti koševi/primljeni koševi/koš razlika)');
    for(let j = 0; j < groupStandings[0].length; j++){
        groupStandings[groupId][j]["groupName"] = groupName;
        console.log((j+1)+". "+groupStandings[groupId][j].team+"     / "+
            groupStandings[groupId][j].wins+" / "+groupStandings[groupId][j].losses+
            " / "+groupStandings[groupId][j].points+" / "+groupStandings[groupId][j].ptsScoredSum+" / "
            +groupStandings[groupId][j].ptsOppSum+" / "+
            (groupStandings[groupId][j].ptsScoredSum-groupStandings[groupId][j].ptsOppSum));
    }
    groupId++;
}

let teamRangs = [[], [], []];

for(let i = 0; i < 3; i++){
    for (let j = 0; j < 3; j++){
        teamRangs[i].push({team : groupStandings[j][i].team,
                           groupName : groupStandings[j][i].groupName,
                           points : groupStandings[j][i].points,
                           ptsScoredSum : groupStandings[j][i].ptsScoredSum,
                           ptsDiff : (groupStandings[j][i].ptsScoredSum - groupStandings[j][i].ptsOppSum)});
    }
}

for(let i = 0; i < 3; i++){
    teamRangs[i].sort(function (e1, e2) {
        if(e1.points > e2.points){
            return -1;
        }
        else if(e1.points == e2.points){
            if(e1.ptsDiff > e2.ptsDiff){
                return -1;
            }
            else if(e1.ptsDiff == e2.ptsDiff){
                if(e1.ptsScoredSum > e2.ptsScoredSum){
                    return -1;
                }
                else{
                    return 1;
                }
            }
            else{
                return 1;
            }
        }
        else{
            return 1;
        }
    });
}

teamRangs = teamRangs.flat();
teamRangs.pop();
console.log('Konacan plasman: ');
for(let i = 0; i < teamRangs.length; i++){
    console.log((i+1)+". "+teamRangs[i].team);
}

let Draw = draw(teamRangs);
console.log("\nZreb:");
for (let i = 1; i<5; i++){
    if(i == 3){
        console.log('----------------------');
    }
    console.log(Draw[i][0]+" : "+Draw[i][1]);
}

playElimination(Draw, teamCodeRankingMap, teamForms, worstRanking, teamResults);

