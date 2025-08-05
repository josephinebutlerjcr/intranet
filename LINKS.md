# Pages
| Page                      | Method    | Desc                              | Permission    | Completed?    |
| ---                       | ---       | ---                               | ---           | ---           |
| Authentication Services |
| /auth/login               | GET       | Primary Login Page                | Unauth.       | X |
| /auth/login               | POST      | Primary Login Page Handler        | Unauth.       | X |
| /auth/login/continue      | GET       | Login: OTP                        | Unauth.       | X |
| /auth/login/continue      | POST      | Login: OTP Handler and Final      | Unauth.       | X |
| General |
| /                         | GET       | Dashboard                         | General       | X |
| /groups                   | GET       | View Student Groups               | General       | X |
| /people                   | GET       | Whose Who of Exec                 | General       | X |
| /family                   | GET       | College Family Basics             | General/Fmly  | |
| /family/tree              | GET       | College Family Tree               | Families      | |
| /account                  | GET       | Membership Registry               | General       | |
| /account                  | POST      | Change basics of details          | General       | |
| /democracy                | GET       | View democratic documents         | General       | |
| Groups Admins |
| /groups/edit              | GET       | Edits own group                   | General*      | |
| /groups/edit/handle       | POST      | Edits own group handle            | General*      | |
| Executive of JCR |
| /exec                     | GET       | Dashboard on abilities            | Exec          | X |
| /exec/groups              | GET       | Registry of groups with edit      | Exec          | X |
| /exec/groups/new          | GET       | Registers a new student group     | Exec          | X |
| /exec/groups/new          | POST      | Handles new group registration    | Exec          | X |
| /exec/groups/edit         | GET       | Edits a existing student group    | Exec          | X |
| /exec/groups/edit         | POST      | Handles edit to a group           | Exec          | X |
| /exec/me                  | GET       | Edits own profile**               | Exec          | X |
| /exec/me                  | POST      | Edits own profile handle**        | Exec          | X |
| Chair and Vice Chair |
| /democracy/new            | GET       | New minutes: upload               | Chair         | |
| /democracy/new            | POST      | New minutes: upload handle        | Chair         | |
| /democracy/edit           | GET       | Edit minutes: upload              | Chair         | |
| /democracy/edit           | POST      | Edit minutes: upload handle       | Chair         | |
| /democracy/standing       | GET       | Edit Standing Orders              | Chair         | |
| /democracy/standing       | POST      | Edit Standing Orders handle       | Chair         | |
| /exec/members             | GET       | Change exec members and autoperm  | Admin         | |
| /exec/members             | POST      | Handle the above                  | Admin         
| Admin |
| /admin/registry           | GET       | Full list of members              | Admin         | |
| /admin/registry/new       | GET       | New member (indiv/import)         | Admin         | |
| /admin/registry/new       | POST      | Handles above                     | Admin         | |
| /admin/registry/edit      | GET       | Edit member (indiv)               | Admin         | |
| /admin/registry/edit      | POST      | Handles above                     | Admin         | |
| /admin/family             | GET       | Import family data/indiv          | Admin         | |
| /admin/family             | POST      | Handles above                     | Admin         | |

# Power Handle
Ranks are in order, top is least, bottom is most, items on top are subsets of items below, e.g. if `chair` then `chair` has `exec` powers.
`Unauth` is the exception; common sense.
- General (anyone in DU or registered alum)
- Exec (anyone on JCR exec)
- Chair (chair or vice chair)
- Admin (pres, facso, vp, webmaster)
> `General*` means general people who are named admins. Of course ranks higher can access, Similar to `Family / Fmly` - those on the college family scheme
> `**`: `admin` can override a person's profile.

# Power technical names
- General is assumed
- `exec`
- `chair`
- `admin`