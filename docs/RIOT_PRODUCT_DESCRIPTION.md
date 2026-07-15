# Riot Developer Portal 제품 설명 초안

## Product name

Oakkk Rank Club

## Product URL

```text
https://your-project.vercel.app
```

## Product description

Oakkk Rank Club is a private community dashboard for a small Discord friend
group. Members can register League of Legends Riot IDs and view current Solo
Queue rank, LP, season win/loss totals, up to twenty recent Solo Queue results,
and current win/loss streaks.

The service also compares registered members' recent match histories. When two
registered players appear in the same Solo Queue match and have the same team
ID, the product displays their same-team game count, wins, losses, and win rate.
This statistic does not claim that the players entered matchmaking as a
premade party, because the public match data only confirms that they appeared
in the same match and on the same team.

The product has a free daily prediction challenge. A member may make one
prediction per calendar day about whether another registered member's official
rank state will be at or above, or below, a selected target after 48 hours.
Participation has no fee or stake. Incorrect predictions do not remove points.
Correct predictions grant a 5-to-20-point activity reward called "Oakkk,"
with the reward determined by the selected challenge difficulty.

Oakkk is a non-purchasable, non-transferable, non-redeemable site activity
point. It cannot be sold, exchanged for money, goods, services, cryptocurrency,
or any external benefit. The product contains no wagering pool, odds, jackpot,
entry fee, loss, user-to-user transfer, cash-out, blockchain, NFT, or
cryptocurrency functionality.

The prediction feature is intended as a free community quiz and social
engagement feature, not betting or gambling.

## Audience

A small, invite-only Discord friend group in South Korea.

## Riot data used

- Account-v1: Riot ID to PUUID
- Summoner-v4: profile icon and summoner level
- League-v4: current Solo Queue tier, division, LP, wins and losses
- Match-v5: up to twenty recent Solo Queue match IDs, match results, team IDs,
  and basic participant statistics

## Data handling

The service stores Riot IDs, PUUIDs, current official rank information, and a
server-side cache of recent Solo Queue match and participant summaries. The
cache is used to avoid repeatedly requesting the same match details and to
calculate same-team statistics among registered members. Riot API keys and
database secret keys are stored only as Vercel server environment variables
and are never exposed to the browser.

## Legal notice displayed on the site

Oakkk Rank Club isn't endorsed by Riot Games and doesn't reflect the views or
opinions of Riot Games or anyone officially involved in producing or managing
Riot Games properties. Riot Games, and all associated properties are
trademarks or registered trademarks of Riot Games, Inc.
