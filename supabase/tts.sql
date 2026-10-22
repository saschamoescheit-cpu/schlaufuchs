-- Zwischenspeicher für die Cloud-Stimme (Edge Function „tts“): fertige MP3-Dateien.
-- Öffentlich lesbar (nur Audio der Aufgabentexte, keine Kinderdaten); schreiben darf nur die Funktion (Service-Rolle).
insert into storage.buckets (id, name, public)
values ('tts', 'tts', true)
on conflict (id) do update set public = true;
