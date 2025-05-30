# PlanBot-API

planbot-api na [docker hub](https://hub.docker.com/r/siqek/planbot-api)

[endpoints](#endpoints)

[dodatkowe uwagi](#dodatkowe-uwagi)

jeżeli obok opisu znajduje się symbol `*`, oznacza to, że istnieją dodatkowe uwagi do tego opisu

> note: parametry typu `string` obsługują wildcardy (symbol `%`)

# Endpointy

[/teachers](#teachers)

[/classes](#classes)

[/class/exists/:class](#classexistsclass)

[/classrooms](#classrooms)

[/classrooms/available](#classroomsavailable)

[/lesson](#lesson)

[/lesson/next-available](#lessonnext-available)

[/day](#day)

## /teachers

### Opis
Zwraca listę wszystkich nauczycieli

### Odpowiedź
Typ zwracanej odpowiedzi: `lista obiektów`

Pola zwróconego obiektu:
- `id: string` - id nauczyciela
- `name: string` - nazwisko nauczyciela

### Przykładowa odpowiedź
```
[
  {
    "id": "XX",
    "name": "J.Kowalski"
  },
  ...
]
```

---

## /classes

### Opis
Zwraca listę wszystkich oddziałów

### Odpowiedź
Typ zwracanej odpowiedzi: `lista stringów`

### Przykładowa odpowiedź
```
[
  "3PRO",
  "3INA",
  "3OPW",
  ...
]
```

---

## /class/exists/:class

### Opis
Zwraca obiekt informujący czy dany oddział istnieje

### Odpowiedź
Typ zwracanej odpowiedzi: `obiekt`

Pola zwracanego obiektu:
- `exists: boolean(int)` - czy dany oddział istnieje (warotść 1 jeżeli istnieje, w przeciwnym razie 0)

### Przykładowa odpowiedź
```
{
  "exists": 1
}
```

---

## /classrooms

### Opis
Zwraca listę wszystkich sal lekcyjnych

### Odpowiedź
Typ zwracanej odpowiedzi: `lista stringów`

### Przykładowa odpowiedź
```
[
  "212",
  "int6",
  "M4",
  ...
]
```

## /classrooms/available

### Opis
Zwraca listę wszystkich wolnych sal lekcyjnych o podanych parametrach

### Parametry
- `day: integer`* (wymagany) - numer dnia dla którego szuka danych
- `lesson: integer`* (wymagany) - numer lekcji dla której szuka danych

### Przykładowa odpowiedź
```
[
  "212",
  "int6",
  "M4",
  ...
]
```

---

## /lesson

### Opis
Zwraca wszystkie wyniki o podanych parametrach

### Parametry
- `day: integer`* (wymagany) - numer dnia
- `lesson: integer`* (wymagany) - numer lekcji
- `teacher_id: string` (opcjonalny) - id nauczyciela
- `teacher_name: string` (opcjonalny) - nazwisko nauczyciela
- `classes: string` (opcjonalnie) - oddział
- `classroom: string` (opcjonalnie) - sala lekcyjna

### Odpowiedź
Typ zwracanej odpowiedzi: `lista obiektów`

Pola zwróconego obiektu:
- `teacher_id: string`
- `teacher_name: string`
- `subject: string`
- `classes: string`*
- `classroom: string`
- `day_num: integer`
- `lesson_num: integer`

### Przykładowa odpowiedź
```
[
  {
    "teacher_id": "PZ",
    "teacher_name": "M.Pszonka",
    "subject": "j.niemiecki",
    "classes": "2PRO;2BUD",
    "classroom": "203",
    "day_num": 0,
    "lesson_num": 0
  },
  ...
]
```

---

## /lesson/next-available

### Opis
Zwraca najbliższą dostępną lekcję (tego samego dnia lub w ciągu kolejnych dni)

### Parametry
- `day: integer`* (wymagany) - numer dnia
- `lesson: integer`* (wymagany) - numer lekcji
- `teacher_id: string` (opcjonalny) - id nauczyciela
- `teacher_name: string` (opcjonalny) - nazwisko nauczyciela
- `classes: string` (opcjonalnie) - oddział
- `classroom: string` (opcjonalnie) - sala lekcyjna

### Odpowiedź
Typ zwracanej odpowiedzi: `lista z obiektem`

### Przykładowa odpowiedź
```
[
  {
    "teacher_id": "PZ",
    "teacher_name": "M.Pszonka",
    "subject": "j.niemiecki",
    "classes": "2PRO;2BUD",
    "classroom": "203",
    "day_num": 0,
    "lesson_num": 0
  }
]
```

---

## /day

### Opis
Zwraca wszystkie lekcje danego dnia zawierające dane podane w parametrach

### Parametry
- `day: integer`* (wymagany) - numer dnia
- `teacher_id: string` (opcjonalny) - id nauczyciela
- `teacher_name: string` (opcjonalny) - nazwisko nauczyciela
- `classes: string` (opcjonalnie) - oddział
- `classroom: string` (opcjonalnie) - sala lekcyjna

### Odpowiedź
Typ zwracanej odpowiedzi: `lista obiektów`

### Przykładowa odpowiedź
```
[
  {
    "teacher_id": "PZ",
    "teacher_name": "M.Pszonka",
    "subject": "j.niemiecki",
    "classes": "2PRO;2BUD",
    "classroom": "203",
    "day_num": 0,
    "lesson_num": 0
  },
  ...
]
```

# Dodatkowe uwagi

`day` - indeksowane od 0 (0 => poniedziałek, 4 => piątek)

`lesson` - indeksowane od 0

pole `classes` to `string`, który zawiera listą oddziałów (klas) rozdzielonych symbolem `;`
