begin;
alter table public.match_trash_talk drop constraint match_trash_talk_text_check;
alter table public.match_trash_talk add constraint match_trash_talk_text_check check(char_length(text) between 1 and 40) not valid;
commit;
