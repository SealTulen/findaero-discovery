"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Search, ShieldCheck } from "lucide-react";
import sourceData from "@/data/sources.json";

type Source = (typeof sourceData)[number];

type SourceHealth = {
  checkedAt: string;
  results: {
    sourceId: string;
    availability: "reachable" | "restricted" | "unavailable";
    httpStatus: number | null;
    checkedAt: string;
    lastSuccessfulAt?: string | null;
    note: string;
  }[];
};

const sources = sourceData as Source[];

export function SourceRegistry() {
  const [sourceHealth, setSourceHealth] = useState<SourceHealth | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [availability, setAvailability] = useState("ALL");

  useEffect(() => {
    let current = true;

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/source-health.json`, {
      cache: "no-store",
    })
      .then((response) =>
        response.ok ? (response.json() as Promise<SourceHealth>) : null,
      )
      .then((report) => {
        if (current && report && Array.isArray(report.results)) {
          setSourceHealth(report);
        }
      })
      .catch(() => {
        if (current) setSourceHealth(null);
      });

    return () => {
      current = false;
    };
  }, []);

  const types = useMemo(
    () =>
      [...new Set(sources.map((source) => source.type))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    [],
  );

  const checks = sourceHealth?.results ?? [];

  const filteredSources = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");

    return sources.filter((source) => {
      const check = checks.find((result) => result.sourceId === source.id);

      if (type !== "ALL" && source.type !== type) return false;
      if (availability === "unchecked" && check) return false;
      if (
        ["reachable", "restricted", "unavailable"].includes(availability) &&
        check?.availability !== availability
      ) {
        return false;
      }

      if (
        needle &&
        ![
          source.name,
          source.type,
          source.status,
          source.limitations,
          source.url,
          source.termsUrl,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(needle)
      ) {
        return false;
      }

      return true;
    });
  }, [availability, checks, query, type]);

  const counts = {
    reachable: checks.filter((item) => item.availability === "reachable").length,
    restricted: checks.filter((item) => item.availability === "restricted").length,
    unavailable: checks.filter((item) => item.availability === "unavailable").length,
  };

  return (
    <div className="feature-card sources-card">
      <div className="card-heading">
        <div>
          <div className="card-kicker">РЕЕСТР И НАДЁЖНОСТЬ</div>
          <h3>Источники данных</h3>
        </div>
        <span className="source-count">
          {sources.length} источников ·{" "}
          {sourceHealth
            ? `проверено ${new Date(sourceHealth.checkedAt).toLocaleString("ru-RU")}`
            : "ожидает первой автоматической проверки"}
        </span>
      </div>

      <div className="source-health-summary" aria-label="Результаты последней проверки URL">
        <span className="source-available"><i />{counts.reachable} HTTP доступно</span>
        <span className="source-permission"><i />{counts.restricted} с ограничением</span>
        <span className="source-unavailable"><i />{counts.unavailable} недоступно</span>
        <span className="source-unchecked"><i />{sources.length - checks.length} не проверено</span>
      </div>

      <div className="source-filters">
        <label className="source-search">
          <Search size={15} />
          <span className="sr-only">Поиск по источникам</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Название, сайт или ограничение"
          />
        </label>

        <label>
          <span>Тип источника</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="ALL">Все типы</option>
            {types.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span>HTTP-доступность</span>
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option value="ALL">Любой статус</option>
            <option value="reachable">HTTP доступен</option>
            <option value="restricted">Доступ ограничен</option>
            <option value="unavailable">HTTP недоступен</option>
            <option value="unchecked">Ещё не проверен</option>
          </select>
        </label>

        <span className="source-filter-count">
          Показано {filteredSources.length} из {sources.length}
        </span>
      </div>

      <div className="source-table">
        <div className="source-row source-head">
          <span>ИСТОЧНИК</span>
          <span>СТАТУС</span>
          <span>ПОСЛЕДНЯЯ УСПЕШНАЯ ПРОВЕРКА</span>
          <span>ОГРАНИЧЕНИЯ</span>
          <span>ССЫЛКИ</span>
        </div>

        {filteredSources.map((source) => {
          const check = checks.find((item) => item.sourceId === source.id);
          const label = check
            ? check.availability === "reachable"
              ? "HTTP доступен"
              : check.availability === "restricted"
                ? "Доступ ограничен"
                : "HTTP недоступен"
            : "Ожидает проверки";

          const lastSuccessfulAt =
            check?.lastSuccessfulAt ??
            (check?.availability === "reachable" ? check.checkedAt : null);

          const statusClass =
            check?.availability === "reachable"
              ? "source-available"
              : check?.availability === "unavailable"
                ? "source-unavailable"
                : source.status === "Требуется разрешение" ||
                    check?.availability === "restricted"
                  ? "source-permission"
                  : "source-unchecked";

          return (
            <div className="source-row" key={source.id}>
              <div className="source-name">
                <span className="source-symbol"><ExternalLink size={14} /></span>
                <div>
                  <b>{source.name}</b>
                  <small>{source.type} · {source.status}</small>
                </div>
              </div>

              <span
                className={`source-status ${statusClass}`}
                title={check ? `${check.note} HTTP ${check.httpStatus ?? "—"}` : source.status}
              >
                <i />{label}
              </span>

              <span className="source-date">
                {lastSuccessfulAt
                  ? new Date(lastSuccessfulAt).toLocaleDateString("ru-RU")
                  : "Ещё не проверен"}
              </span>

              <span className="source-limits">{source.limitations}</span>

              <div className="source-links">
                <a className="source-link" href={source.url} target="_blank" rel="noreferrer">
                  Открыть сайт <ArrowRight size={12} />
                </a>
                {source.termsUrl ? (
                  <a className="source-policy-link" href={source.termsUrl} target="_blank" rel="noreferrer">
                    Правила использования <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="source-terms-missing">Правила не указаны</span>
                )}
              </div>
            </div>
          );
        })}

        {!filteredSources.length && (
          <p className="source-empty">
            По выбранным условиям источники не найдены. Измените запрос или сбросьте фильтры.
          </p>
        )}
      </div>

      <div className="source-footnote">
        <ShieldCheck size={14} />
        Ежедневная проверка определяет только HTTP-доступность URL; она не подтверждает наличие
        RSS/API и не разрешает сбор или повторное использование материалов. События публикуются
        после ручной сверки минимум по двум источникам.
      </div>

      <div className="asset-credits">
        <b>КАРТОГРАФИЯ И МОДЕЛИ</b>
        <span>Контур России — геоданные Natural Earth, public domain.</span>
        <span>
          Модель самолёта — amvlab,{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          . Безлоготипный A320, используется без изменений.
        </span>
      </div>
    </div>
  );
}
