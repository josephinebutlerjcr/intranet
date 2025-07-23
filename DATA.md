# Users
> `eu-west-2`, `users`

```json
{
    "cis": "abcd12",
    "generated": 1752178881,
    "login": {
        "attempts": 0,
        "attemptsOnCode": 0,
        "code": "",
        "generated": -1
    },
    "membership": "N/R",
    "name": "Name Surname",
    "privilege": "admin",
    "token": {
        "exp": 1755260481,
        "key": "72e58eeabb8529a11578b7972d8aa3f6"
    },
    "avatar":"abcd12.jpg",
    "bio":"Hello World"
}
```
`privelege` may be blank, if so it is assumed `general`.

`name` may be blank.

`bio` and `avatar` may be blank.

# Groups
> `eu-west-2`, `groups`

```json
{
    "id":"soc-butler-slacklining",
    "category":"society",
    "name":"Butler Slacklining",
    "events":[
        {
            "title":"AGM",
            "date":"01-07-2025",
            "time":"1400",
            "location":"Botanic Gardens"
        }
    ],
    "description":"The Best",
    "awards":[
        "2025 Best New Society"
    ],
    "admins":{
        "president":["abcd12"]
    },
    "socials":{
        "whatsapp":"LINK",
        "instagram":"butler.slackline"
    },
    "avatar":false
}
```
`admins` must include CIS of president - and any other personalised people

`email` may be included. If not, email will be given as the president.

`socials` may include: `whatsapp`, `instagram`, `facebook`