# Decisions for the church

**Six things only the parish can decide.** None of them is a technical problem,
none can be solved by writing more code, and all six are open today.

This page is written for the people who will actually decide — a treasurer, a
priest, a parish council — not for a developer. There is no code in it. Where a
decision has technical consequences, they are described in plain terms and the
detailed version is linked at the end of each item.

**All six should now be settled before real families enrol and pay.** The fifth
used to be the one that could wait — nothing was at stake until a child finished
a subject. That changed when the landing page began showing a specimen
certificate: the earned titles are on the public page, in front of every parent
deciding whether to enrol.

The sixth is the cheapest on the list and the easiest to leave undone. It is
here for the same reason receipt retention is: it costs one person ten minutes
now, and it is the kind of thing that is embarrassing later.

---

## At a glance

| # | Decision | Who answers it | If we defer it |
|---|---|---|---|
| 1 | Who owns the Stripe account, **and the Firebase billing account** | Parish council + treasurer | No card payments, every payment stays manual, and the teachers' roster gets slower as the school grows |
| 2 | Who owns the Firebase project | Parish council | Children's records sit in one person's private Google account |
| 3 | How long things are kept — receipts, and questions a child wrote | Treasurer + accountant; the second half is the parish's, not an accountant's | We keep everything forever by default; the cheap receipts option expires, and no one can ever remove a child's own words |
| 4 | Whether the consent method is lawful | A lawyer, paid for by the parish | We should not enrol paying families |
| 5 | Whose names, and which titles, go on a certificate | A መምህር + priest + parish council | Certificates go out unsigned, and unapproved titles are already on the public page |
| 6 | Verifying the currency conversion table | Treasurer, ten minutes with a bank rate | Families abroad see no local figure at all, or eventually a stale one |

---

## 1. Who owns the Stripe account, and the Firebase billing

### The decision

Stripe is the company that would process card payments. Someone has to own that
account: it is a financial account in a real organisation's name, tied to a bank
account, with a person legally responsible for it.

**It has to be the US parish.** Stripe does not operate in Ethiopia, so the
developer cannot hold it, and the parish cannot borrow someone else's. The
parish needs to open it in the church's name, with the church's bank details,
and decide who administers it.

The developer's share of any money is a separate arrangement, paid separately.
It is not a reason to put the account in his name.

### Why it cannot be decided in code

The software can be pointed at any Stripe account in about a day. What it cannot
do is *be* the account holder. Opening it requires an organisation's legal name,
tax details, a bank account and a named responsible person. Those are things a
church has and a piece of software does not.

### If it is deferred

Nothing breaks. Card payment simply stays switched off, and payment continues
the way it works today: a family pays the church directly, by whatever means the
parish already uses, and a teacher marks the account as paid. That is safe and
it is working. It is only *manual* — someone has to do it for every family,
every term.

The cost of deferring is administrative time, and it grows with the number of
families. At ten students it is trivial. At a hundred it is a job.

### What changes once it is answered

Families can pay by card and their accounts open automatically instead of
waiting on a teacher. The small piece of server code that listens for the
payment runs on Blaze, which is the same thing the roster and the deletion job
need — so answering this one answers three.

### The cheapest thing on this page, asked for at the same time

**Firebase needs to move from the free plan to the pay-as-you-go one.** It is
called Blaze. It takes the same card as Stripe, in the same sitting, and at this
school's size it will almost certainly cost **nothing at all** — the free
allowances do not go away on Blaze, they simply stop being a hard ceiling.

This is a *developer* need rather than a parish one, and it is listed here only
because the parish holds the card. Nothing about children's data or church
policy turns on it.

**What it is for.** The site has no server at all today. Everything happens in
the family's browser, which is cheap and simple and has one real limit: some
work cannot be trusted to a browser, and some cannot be done fast enough in one.
Two things are already waiting on it:

- **The teachers' roster.** To show how many lessons each child has finished,
  the page currently asks the database to count them, one child at a time. That
  is fine for the tens of students the school has. Measured at a thousand
  students it takes over twenty seconds to draw, which is not a usable page. A
  small piece of server code would keep a running total instead, and the roster
  would open instantly at any size.
- **Deleting a family's data properly.** `docs/DELETION.md` is a checklist a
  person follows by hand in the console. A scheduled job could do it reliably,
  which is what item 3 will need once a retention period exists.

**If it is deferred:** nothing breaks. The roster stays fast enough for the
school as it is, and deletions stay manual. This becomes urgent only if the
school grows past a few hundred students, and it is here now because it costs
one minute and one card while somebody is already entering card details.

**One caution worth stating plainly.** Blaze means the bill *can* rise above
zero, which the free plan makes impossible. The protection is a budget alert —
set a cap (say $10 a month) when the account is created and Google will email
before anything approaches it. Ask for that at the same time.

### A second question that arrives with the first

**Once card payment works, families outside the United States can pay too.** A
card issued in the UK, Germany, Canada or the Gulf will simply go through. The
registration form already asks which country a family is in, and the diaspora
this school is for does not live only in America.

**That is a policy question, not a technical one.** Nothing needs building for
it to happen — it happens by default the day Stripe is switched on, unless
somebody decides otherwise. So the parish should decide on purpose whether the
school enrols families outside the US, rather than discovering the answer from
a bank statement.

It matters because of item 4. **All of the consent and privacy work assumes US
children.** It was built around COPPA, which is a United States law. A family in
the UK or the EU is covered by GDPR instead, which treats children's data
differently: it sets its own age of consent (13 to 16, varying by country), it
gives families rights the current policy does not describe, and it can apply to
a US organisation that knowingly serves European families. A Canadian or Gulf
family raises smaller but similar questions.

Nobody needs to solve that here. What matters is the timing: **it is the same
lawyer, in the same hour.** Ask both questions at once — "is our consent method
sufficient for children in the US?" and "may we enrol families outside the US,
and what changes if we do?" — rather than paying twice, or worse, discovering
the second question after a family in London has already enrolled.

If the answer is "US families only", that is a perfectly good answer, and it
becomes a line in the terms of service and a check at registration. It is a
small piece of work. Finding out afterwards is not.

*Technical detail: `docs/PAYMENTS.md`. Related: item 4 below.*

---

## 2. Who owns the Firebase project

### The decision

Firebase is Google's service that stores the accounts, the study records and the
quiz results. Today the project sits inside **one person's personal Google
account** — the developer's.

The parish needs to decide who owns it. In practice that means creating a Google
account belonging to the church, not to a person, and moving the project into
it, with at least two people from the parish able to get in.

### Why it cannot be decided in code

This is a question about custody of children's records, not about software. Every
child's name, age, parent's email address and study history is in there. The
software works identically whoever owns the account; what changes is **who is
legally and practically responsible for the data, and who can still reach it if
the developer is unavailable.**

No amount of code can make a personal account belong to a church.

### If it is deferred

Two risks, and the second is the serious one.

**The bus problem.** If the developer is unreachable — illness, travel, a fallen
out, anything — nobody at the parish can reach the children's records, reset a
parent's access, or shut the service down. There is no second key.

**The custody problem.** Parents are being asked to entrust their children's
information to the church. Right now it is held in a private individual's
account. That is very likely not what a parent understands they are agreeing to,
and it is the kind of thing that reads badly in hindsight if anything ever goes
wrong.

Neither risk causes a visible failure. Both simply sit there, getting slightly
worse as more families join.

### What changes once it is answered

Ownership moves, the parish holds the keys, and more than one person can act.
The move itself is straightforward and causes no interruption for families.

---

## 3. How long things are kept — receipts, and a child's own words

### The decision (a): payment receipts

When a family pays, the system now writes a receipt: the parent's name, their
email, the amount, and what it covered. These are kept separately from anything
about the child — deliberately, so that a child's record can be deleted promptly
while the church's books survive.

**Nobody has said how long the receipts themselves are kept.** Today the answer
is "forever", which is a default rather than a decision.

There is also a **second choice inside this one, and it expires:**

- Keep a **receipt per family**, linked to their account — more detail, and it
  names a parent indefinitely.
- Keep only **totals per period** — "this term the school received $2,400 across
  22 enrolments" — which may well be all the books actually need, and which
  names nobody.

The second option keeps far less information about real people. It is available
cheaply *now*, while almost no receipts exist. Once several terms of individual
receipts have accumulated, switching to totals means either discarding real
records or doing a messy conversion. **This is the only item on this page with a
deadline attached to the cheap option.**

### The decision (b): questions a child wrote, which nobody can delete

Added 2026-09-20. After a lesson, a child is invited to ask their teacher a
question — "was there something you did not understand?" — in their own words.
The teacher answers, and the parent reads both halves.

These are stored on the child's record, and **nothing can delete one.** Not the
child, not the teacher who answered, not the school administrator. That was
built deliberately: a teacher who could erase an awkward exchange is exactly the
risk the whole feature is shaped against, and a question a family has read
should not be able to vanish.

**But "immutable once answered" and "deletable by nobody, ever" are two
different promises, and only the first one was asked for.** The second is what
got built, because it is the safer default and because no one had decided
otherwise. It should be a decision rather than a default, and it belongs to the
parish, so here it is.

What it means in practice: an eight-year-old writes, in their own words, that
they did not understand something. That sentence is on their record when they
are fourteen. If the family asks for everything to be deleted, the school's
administrator can still remove it by hand — the refusal applies to the website,
not to the console — but nothing expires on its own and nobody can remove a
single question without removing the account.

Three positions are available, and the parish should pick one:

- **Keep it as it is.** Nothing is ever removed except by a full deletion
  request. Simplest, safest against a teacher hiding something, hardest on a
  family who wants one thing gone.
- **Let the parent delete a question about their own child.** A parent can
  already read every one; letting them remove one is consistent with that. The
  risk is a parent erasing a record a teacher may need.
- **Expire them on a clock** — end of term, end of year — the same question
  `docs/RETENTION.md` raises about teachers' notes, and probably best answered
  for both at once.

There is no deadline attached and nothing is at risk today, because no child has
asked a question yet. It gets harder to change once they have.

### Why it cannot be decided in code

The right retention period comes from what the parish is actually required to
keep, which depends on its jurisdiction, its nonprofit status, and its
accountant's advice. A developer choosing a number would be inventing a legal
answer and hiding it in a settings file where nobody would ever find it again.

The totals-versus-per-family question is likewise a bookkeeping question: it
depends on what the treasurer needs to be able to show, and to whom.

The children's-questions half is not a bookkeeping question at all, and it is
the one place on this page where a developer has already made the choice by
building something. That is precisely why it is written down: a default that
nobody chose is still a default, and this one says a child can never take back
something they wrote. Somebody should agree to that on purpose, or change it.

### If it is deferred

Receipts accumulate indefinitely. Nothing breaks and no family is harmed, but
the church holds a growing list of parents' names, emails and payment amounts
with no stated reason for how long — which is the same gap the privacy policy is
otherwise careful to avoid.

And the totals-only option quietly stops being cheap.

On the questions half, deferring means the current answer stands: nothing is
ever deleted. That is a real position and possibly the right one — it is just
nobody's decision yet.

### What changes once it is answered

A stated period goes into the privacy policy, so parents are told. If the
totals-only route is chosen, the change is made before there is anything much to
convert. A small routine to expire old receipts would then need building — that
part is a developer job, but it cannot start until the period exists.

For the questions: if the answer is "keep it as it is", nothing changes but a
recorded decision, and `privacy.html` can say plainly that a question is
permanent. If it is either of the other two, it is a rules change and a small
piece of interface — days, not weeks — and it is much cheaper now than after a
year of questions exist.

*Technical detail: `docs/RETENTION.md` §6 and §7 for the receipts, §2c for the
questions. The deletion procedure is `docs/DELETION.md`.*

---

## 4. Whether the consent method is lawful

### The decision

**This is the one that should genuinely block launch.**

The Bible track is for children aged 7 to 13. In the United States, collecting
personal information about a child under 13 requires *verifiable parental
consent* under a federal law called COPPA. The penalties are per-child and they
are not small.

What the site does today: a parent creates the account (never the child), ticks
a box confirming they are the parent and consent to their child enrolling, and
must then confirm their email address before anything works. The date and the
version of the policy they agreed to are recorded.

That is a genuine, careful attempt. **It has not been reviewed by a lawyer, and
it may not be enough.** A self-declared tick-box is generally *not* accepted on
its own as verifiable consent. The verified email resembles a recognised method
sometimes called "email plus", but the site was not built to satisfy that
method's specific requirements, and nobody qualified has confirmed that it does.

The parish needs to pay for an hour or two of a lawyer's time — someone who
knows US children's-privacy or nonprofit/education law — and get a straight
answer.

### Why it cannot be decided in code

A developer can build any consent mechanism that is asked for. What a developer
cannot do is decide **which mechanism is legally sufficient.** That is a legal
judgement about a specific law in a specific country, and getting it wrong is
not the kind of mistake that shows up as a bug report.

Deliberately, the privacy policy currently describes exactly what the system does
and claims nothing more. It does not say "COPPA compliant" anywhere, because
nobody has established that it is. **No compliance language should be added
without the lawyer.**

### If it is deferred

The service should not enrol real families and take real money. Everything else
on this list degrades gracefully if ignored; this one does not.

The exposure is not theoretical: it is children's personal information, collected
in the US, from families who trusted a church with it.

### What changes once it is answered

One of three things:

- The current method is confirmed as sufficient — nothing changes but a
  documented answer, and the policy can finally say so.
- A small addition is required (a signed form, a nominal card verification, a
  follow-up confirmation email). These are days of work, not months.
- A different approach is needed. Better to learn that before a hundred families
  have accounts than after.

*Context: the security section of `CLAUDE.md`.*

---

## 5. Whose names, and which titles, go on a certificate

### The decision

When a child finishes a subject, they receive a certificate they can download
and print. It carries the school's name, the child's name, the subject, the
**title the child has earned**, and the date.

Two separate things on that document need a church's authority behind them, and
neither has it yet.

**a) The signature lines — currently ABSENT, not blank.** The certificate
carries no signature block at all today. It used to print the placeholders
`TEACHER_NAME`, `PRIEST_NAME` and `PARISH_NAME`; leaving ruled lines with
nothing on them made the document look unfinished, which is worse for a family
to receive than a certificate that simply does not claim a signature. So the
whole block was removed until there are real names for it.

The names are parked, unused, in `assets/js/config.js`. Restoring the block is
one change once the parish answers:

- **Which teacher signs** — the teacher who taught that subject, or one person
  for the whole school?
- **Does a priest sign too?** The second line assumes the parish administrator
  or priest. If that is not wanted, the line is removed rather than left empty.
- **Which parish is named**, in full and in the correct form.
- **Is a diocesan blessing sought?** A certificate carrying a diocese's
  recognition means something quite different from one that does not — and it is
  not something a school may simply claim.

**b) The earned titles.** Each subject awards a title, printed on the
certificate as the thing the child is now called. There are twelve, one per
subject, and **a መምህር should name them — not a developer.** They are the
language of a tradition, and they are what a family will read aloud.

| Subject | Title as it currently reads |
|---|---|
| አምስቱ አዕማደ ምስጢራት | የምስጢራት ዐዋቂ |
| ሥርዓተ ቤተ ክርስቲያን | የሥርዓት ጠባቂ |
| የመጽሐፍ ቅዱስ ታሪክ | የታሪክ ዐዋቂ |
| የቤተ ክርስቲያን ታሪክ | የአበው ታሪክ ዐዋቂ |
| ክርስቲያናዊ ሥነ ምግባር | የመልካም ምግባር ባለቤት |
| ውዳሴ ማርያም | የውዳሴ ማርያም ዘማሪ |
| መዝሙረ ዳዊት | የመዝሙር ባለቤት |
| አቋቋም | የአቋቋም ሰልጣኝ |
| ጾመ ድጓ | የጾመ ድጓ ዘማሪ |
| ምዕራፍ | የምዕራፍ ዐዋቂ |
| ቅዳሴ | የቅዳሴ ዘማሪ |
| ዝማሬ መዋሥዕት | የዝማሬ መዋሥዕት ዘማሪ |

To be plain about where these came from: **the last four were written by a
developer**, following the pattern of the ones above them, when the Zema
curriculum was expanded to seven subjects. The other eight were written earlier
in the project and have never been reviewed by anyone in the church either. So
the honest position is that **none of the twelve carries a መምህር's approval**,
and the four newest are simply the ones nobody has ever pretended did.

They can be kept, changed, or replaced wholesale. The point is that somebody
qualified should look at the list before a child is handed one.

### Why it cannot be decided in code

Putting a name on a certificate is putting a person's authority behind it. A
developer choosing a name would be signing a document about a child on behalf of
someone who never agreed to it. Whether a diocese's recognition may be
represented is a matter for the church hierarchy, and claiming it without leave
would be a serious thing to have done.

Blank ruled lines were the alternative and they are worse: a parent reading one
cannot tell whether the school forgot to sign it or whether something went
wrong in printing. Absent is unambiguous — the certificate says what the child
did, and claims no signature it does not have.

The titles are the same kind of question wearing a friendlier face. They are
easier to overlook precisely because they *already read plausibly* — nothing
about `የቅዳሴ ዘማሪ` announces that a developer chose it, which is exactly why it
needs a መምህር's eye rather than a shrug. Naming what a child has become in a
tradition is not a formatting decision.

### If it is deferred

Certificates are issued, and they carry no signature. That is survivable — the
document still names the child, the subject, the date and the school — but a
certificate from a church school that nobody has signed is a smaller thing than
it should be.

The titles carry a quieter risk: unlike the signature lines, they would not stop
anybody. A certificate reading `TEACHER_NAME` gets caught; one awarding a title
no መምህር chose would simply be printed, framed, and read aloud. If only one half
of this item is answered, answer the titles.

**This stopped being the least urgent item on 2026-09-15.** It used to be —
nothing was at stake until a child finished a subject. Then the landing page
started showing a specimen certificate, so that what a child earns is visible
to a parent deciding whether to enrol.

The specimen carries no signature block, because no certificate does — the
sample a parent sees on the landing page and the document their child would
actually receive are now the same object, which is the honest arrangement.
Nobody is being shown a signature the school does not have. But it does mean
the certificate is now part of how the school presents itself, rather than a
document that appears only at the end — and the titles in the table above are
printed on it, in full, on the public page.

So the practical deadline moved forward: not "when the first child finishes",
but **before the site is shown to families at all**.

### What changes once it is answered

Three names are filled in, the signature block goes back into
`assets/js/certificate.js`, and the twelve titles are confirmed or replaced.
All of it is a data edit plus one small block of markup — no rebuild, no
migration, and nothing already issued to correct, since none has been.

If a blessing is granted, the certificate also carries it. Until then it states
plainly what it is — a record that a child took part and completed the subject —
and explicitly says it is **not** a diocesan accreditation, which matches what
the terms of service already tell parents.

---

## 6. Verifying the currency conversion table

### The decision

Every price on the site is in **US dollars**, and every payment is charged in US
dollars. That does not change and is not in question here.

But a family in Nairobi or Dubai reading "$50" does not immediately know what
that means to them. So beneath each price the site shows an *approximate* figure
in their own currency — clearly marked as approximate, with the date of the rate
printed next to it, and with a line saying the charge is in dollars and their
bank sets the final rate.

Those rates are typed into a small table by hand. **Nobody at the parish has
checked them, and one of them is deliberately blank.**

The blank one is **the Ethiopian birr.** The birr has moved a great deal since
it was floated, any figure entered from memory would be badly wrong, and a
parent in Addis is precisely the person who would notice. Showing nothing is
honest; showing a number that is badly wrong is not. So the birr row shows no
approximate figure at all until somebody fills it in from a real source.

What is needed: one person, with a bank's published rate or a reputable
exchange-rate site, spending ten minutes confirming the figures and supplying
the birr. Then the same again perhaps twice a year.

### Why it cannot be decided in code

The software can display any rate it is given and can do the arithmetic
perfectly. What it cannot do is **know whether a rate is true.**

The site could fetch live rates automatically, and that was considered and
rejected. It would cost nothing in money but it adds a live dependency on an
outside service to a site that currently has none; the figure would shift
between one page load and the next; there is no server here to cache it; and the
free feeds that carry the birr generally carry the *official* rate rather than
the rate a family actually gets — so the site would be spending complexity to
display a number that is differently wrong. A table checked by a person twice a
year is both simpler and more honest.

Which leaves it as a small, recurring human task — and those belong to whoever
owns the school's money, not to whoever wrote the page.

### If it is deferred

Nothing breaks and nobody is misled. A family whose currency has no rate simply
sees the dollar price with no local figure beside it, which is the same thing
every website showed ten years ago.

The risk is slower. Rates drift. A table dated eighteen months ago, still shown
with confidence beside a price, is worse than no table — and the date printed
beside it is what stops that being invisible, not what stops it happening.

This is the same class of item as receipt retention (item 3): cheap now,
embarrassing later.

### What changes once it is answered

The figures are corrected, the birr row is filled in, and the approximate line
appears by itself for every Ethiopian family — no code change, just the number
and its date. The parish then re-checks it on whatever schedule it decides, and
the printed date makes it obvious when nobody has.

*Technical detail: the table is `FX` in `assets/js/config.js`, with the date it
was last set. `tests/pricing.test.mjs` asserts that no rate is zero or negative
and that a currency with no rate shows nothing rather than a guess.*

---

## What is NOT on this list

For clarity at a meeting, these have already been decided and need no action:

- **Where lesson videos live.** Unlisted YouTube, free. Settled.
- **Card details.** Never touched by this site; they would go directly to
  Stripe. Settled and not negotiable.
- **Who can see a child's record.** The parent, the one teacher assigned to that
  child, and the administrator. Nobody else. Enforced by the server, not just by
  the pages.
- **What happens when a family stops paying.** Their child keeps every
  certificate, badge and score already earned. Only new lessons close.
