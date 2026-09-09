# Decisions for the church

**Five things only the parish can decide.** None of them is a technical problem,
none can be solved by writing more code, and all five are open today.

This page is written for the people who will actually decide — a treasurer, a
priest, a parish council — not for a developer. There is no code in it. Where a
decision has technical consequences, they are described in plain terms and the
detailed version is linked at the end of each item.

**Four of these should be settled before real families enrol and pay.** The
fifth (certificates) can wait until the first child finishes a subject, but not
longer.

---

## At a glance

| # | Decision | Who answers it | If we defer it |
|---|---|---|---|
| 1 | Who owns the Stripe account | Parish council + treasurer | No card payments; every payment stays manual |
| 2 | Who owns the Firebase project | Parish council | Children's records sit in one person's private Google account |
| 3 | How long payment receipts are kept | Treasurer + accountant | We keep them forever by default, and the cheap option expires |
| 4 | Whether the consent method is lawful | A lawyer, paid for by the parish | We should not enrol paying families |
| 5 | Whose names sign a certificate | Priest + parish council | Certificates cannot be issued |

---

## 1. Who owns the Stripe account

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
waiting on a teacher. It also needs somewhere for a small piece of server code
to run, which is a separate small cost (roughly $0–25 a month depending on the
option chosen) — that part *is* a developer decision and does not need the
parish.

*Technical detail: `docs/PAYMENTS.md`.*

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

## 3. How long payment receipts are kept

### The decision

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

### Why it cannot be decided in code

The right retention period comes from what the parish is actually required to
keep, which depends on its jurisdiction, its nonprofit status, and its
accountant's advice. A developer choosing a number would be inventing a legal
answer and hiding it in a settings file where nobody would ever find it again.

The totals-versus-per-family question is likewise a bookkeeping question: it
depends on what the treasurer needs to be able to show, and to whom.

### If it is deferred

Receipts accumulate indefinitely. Nothing breaks and no family is harmed, but
the church holds a growing list of parents' names, emails and payment amounts
with no stated reason for how long — which is the same gap the privacy policy is
otherwise careful to avoid.

And the totals-only option quietly stops being cheap.

### What changes once it is answered

A stated period goes into the privacy policy, so parents are told. If the
totals-only route is chosen, the change is made before there is anything much to
convert. A small routine to expire old receipts would then need building — that
part is a developer job, but it cannot start until the period exists.

*Technical detail: `docs/RETENTION.md` §6 and §7.*

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

## 5. Whose names sign a certificate

### The decision

When a child finishes a subject, they receive a certificate they can download
and print. It carries the school's name, the child's name, the subject, the
badge earned and the date.

It also has two signature lines and the parish's name — and all three are
currently blank placeholders reading `TEACHER_NAME`, `PRIEST_NAME` and
`PARISH_NAME`.

The parish needs to decide:

- **Which teacher signs** — the teacher who taught that subject, or one person
  for the whole school?
- **Does a priest sign too?** The second line assumes the parish administrator
  or priest. If that is not wanted, the line is removed rather than left empty.
- **Which parish is named**, in full and in the correct form.
- **Is a diocesan blessing sought?** A certificate carrying a diocese's
  recognition means something quite different from one that does not — and it is
  not something a school may simply claim.

### Why it cannot be decided in code

Putting a name on a certificate is putting a person's authority behind it. A
developer choosing a name would be signing a document about a child on behalf of
someone who never agreed to it. Whether a diocese's recognition may be
represented is a matter for the church hierarchy, and claiming it without leave
would be a serious thing to have done.

The placeholders are deliberately left as obvious English capitals rather than
plausible Amharic names, so that a certificate escaping in this state is
instantly recognisable as unfinished rather than quietly wrong.

### If it is deferred

Certificates cannot be issued. A child who finishes a subject can still download
one, but it will read `TEACHER_NAME`, which is obviously not something to hand a
family.

This is the least urgent item on the page, because no child has finished a
subject yet. It becomes urgent the moment one does.

### What changes once it is answered

Three names are filled in and certificates are ready. If a blessing is granted,
the certificate also carries it. Until then it states plainly what it is — a
record that a child took part and completed the subject — and explicitly says it
is **not** a diocesan accreditation, which matches what the terms of service
already tell parents.

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
